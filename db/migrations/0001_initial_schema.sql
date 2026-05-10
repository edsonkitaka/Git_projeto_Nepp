-- =====================================================================
-- Lombar Ativa — Portal Observatório de Saúde (NEPP/UNICAMP)
-- Migration 0001: schema inicial
-- =====================================================================
--
-- Modelo de dados desenhado para:
--   1. Anonimato do participante (id randômico; e-mail opcional para D+7)
--   2. Coleta longitudinal D0 + D7 com cálculo de ΔEVA
--   3. Cruzamento analítico por escolaridade × raça/cor × CID × PICS
--   4. Conformidade LGPD (consentimento explícito, soft-delete, RLS)
--
-- Convenções:
--   - snake_case para tabelas/colunas (padrão Postgres)
--   - timestamps em UTC com timezone
--   - enums tipados em vez de strings livres (integridade analítica)
--   - categorias seguem IBGE (raça/cor) e CID-10 onde aplicável
-- =====================================================================

create extension if not exists "pgcrypto";  -- gen_random_uuid()
create extension if not exists "citext";    -- e-mail case-insensitive

-- ---------- ENUMS ----------------------------------------------------

-- Escolaridade — categorização compatível com PNAD (IBGE)
-- Para análise, agrupamos em "baixa" (Fund/Médio) vs "alta" (Sup+) na view.
create type escolaridade as enum (
  'sem_instrucao',
  'fundamental_incompleto',
  'fundamental_completo',
  'medio_incompleto',
  'medio_completo',
  'superior_incompleto',
  'superior_completo',
  'pos_graduacao'
);

-- Raça/cor — categorias oficiais IBGE (autodeclaração)
create type raca_cor as enum (
  'branca',
  'preta',
  'parda',
  'amarela',
  'indigena',
  'nao_declarada'
);

-- Sexo biológico (para análise epidemiológica; identidade de gênero é outro campo)
create type sexo_biologico as enum (
  'feminino',
  'masculino',
  'intersexo',
  'nao_informado'
);

-- Momento da medição EVA — D0 (baseline) ou D7 (follow-up)
create type momento_eva as enum ('baseline', 'follow_up_7d');

-- Uso de PICS (Práticas Integrativas e Complementares)
create type uso_pics as enum (
  'nunca_usou',
  'ja_usou_passado',
  'usa_atualmente'
);

-- ---------- PARTICIPANTES --------------------------------------------

-- Cada participante é anônimo por padrão (UUID).
-- E-mail é OPCIONAL e armazenado com hash + último-dígito-do-domínio
-- para permitir o disparo do follow-up D+7 sem expor PII em queries analíticas.
create table participantes (
  id              uuid primary key default gen_random_uuid(),
  criado_em       timestamptz not null default now(),

  -- Demografia (perfil)
  idade           int check (idade between 0 and 120),
  sexo            sexo_biologico,
  raca            raca_cor,
  etnia_livre     text,  -- ex: "quilombola", "ribeirinha" — texto livre opcional
  escolaridade    escolaridade,

  -- Canal de follow-up — opt-in explícito
  email_hash      bytea,           -- sha256 do e-mail normalizado; nunca o e-mail em claro
  email_dominio   text,            -- ex: "gmail.com" — útil pra análise de cohort sem PII
  follow_up_token uuid unique default gen_random_uuid(),  -- link mágico do D+7

  -- LGPD
  soft_deleted_em timestamptz
);

create index participantes_criado_em_idx on participantes (criado_em);
create index participantes_email_hash_idx on participantes (email_hash) where email_hash is not null;

comment on table participantes is
  'Sujeito de pesquisa anônimo. E-mail nunca armazenado em claro — apenas hash sha256 + domínio.';

-- ---------- CONSENTIMENTO LGPD / TCLE --------------------------------

-- Histórico de consentimentos. Versionado para auditoria — quando o TCLE
-- for atualizado, criamos uma nova linha em vez de mutar a anterior.
create table consentimentos_lgpd (
  id              uuid primary key default gen_random_uuid(),
  participante_id uuid not null references participantes(id) on delete cascade,
  versao_tcle     text not null,            -- ex: "v1.0-2026-05"
  aceito_em       timestamptz not null default now(),
  ip_hash         bytea,                    -- sha256(ip + salt) para auditoria sem expor IP
  user_agent      text,
  revogado_em     timestamptz
);

create index consentimentos_participante_idx on consentimentos_lgpd (participante_id);

-- ---------- TRIAGEM RED FLAGS ----------------------------------------

-- Excluir urgências médicas. Se qualquer red_flag = true, encerrar fluxo
-- e orientar busca por atendimento presencial.
create table triagens_red_flags (
  id                       uuid primary key default gen_random_uuid(),
  participante_id          uuid not null references participantes(id) on delete cascade,
  registrada_em            timestamptz not null default now(),

  -- Red flags clássicas para dor lombar (NICE 2016 / NHS)
  trauma_recente           boolean not null default false,
  perda_peso_inexplicada   boolean not null default false,
  febre_persistente        boolean not null default false,
  incontinencia_urinaria   boolean not null default false,
  dor_noturna_intensa      boolean not null default false,
  fraqueza_progressiva     boolean not null default false,
  historico_cancer         boolean not null default false,

  encerrado_por_red_flag   boolean not null
    generated always as (
      trauma_recente or perda_peso_inexplicada or febre_persistente
      or incontinencia_urinaria or dor_noturna_intensa
      or fraqueza_progressiva or historico_cancer
    ) stored
);

create index triagens_participante_idx on triagens_red_flags (participante_id);

-- ---------- RESPOSTAS CLÍNICAS ---------------------------------------

-- Localização da dor, gatilhos, estado emocional, comorbidades, hipótese CID.
-- Comorbidades como array para permitir múltipla seleção sem explodir colunas.
create table respostas_clinicas (
  id                  uuid primary key default gen_random_uuid(),
  participante_id     uuid not null references participantes(id) on delete cascade,
  registrada_em       timestamptz not null default now(),

  localizacao_dor     text,            -- ex: "lombar_apenas", "lombar_pernas", "lombar_quadril"
  gatilho             text,            -- ex: "tempo_em_pe", "carregar_peso"
  comorbidades_cid10  text[] not null default '{}',  -- ex: '{E11,I10,M79.7}'
  estado_emocional    text[] not null default '{}',  -- ex: '{ansioso,estressado}'

  -- Hipótese CID-10 calculada pelo bot (não diagnóstico médico)
  hipotese_cid10      text,            -- ex: 'M54.5' (lombalgia) ou 'M54.4' (lombociatalgia)

  notas               text
);

create index respostas_clinicas_participante_idx on respostas_clinicas (participante_id);

-- ---------- MEDIÇÕES EVA ---------------------------------------------

-- Escala Visual Analógica (0-10). Coletada em D0 e D7.
-- ΔEVA é calculado em view, não armazenado, para evitar inconsistência.
create table eva_medicoes (
  id              uuid primary key default gen_random_uuid(),
  participante_id uuid not null references participantes(id) on delete cascade,
  momento         momento_eva not null,
  valor           int not null check (valor between 0 and 10),
  registrada_em   timestamptz not null default now(),
  unique (participante_id, momento)  -- só uma medição por momento por participante
);

create index eva_participante_idx on eva_medicoes (participante_id);

-- ---------- USO DE PICS ----------------------------------------------

create table pics_uso (
  id              uuid primary key default gen_random_uuid(),
  participante_id uuid not null references participantes(id) on delete cascade,
  registrado_em   timestamptz not null default now(),
  historico       uso_pics not null,
  praticas        text[] not null default '{}',  -- ex: '{meditacao,yoga,acupuntura}'
  acessou_audio   boolean not null default false  -- ouviu meditação guiada do portal?
);

create index pics_participante_idx on pics_uso (participante_id);

-- ---------- FOLLOW-UPS AGENDADOS -------------------------------------

-- Agenda do D+7. pg_cron ou edge function consome esta tabela.
create type status_followup as enum (
  'agendado',
  'enviado',
  'respondido',
  'expirado',
  'cancelado'
);

create table follow_ups (
  id                 uuid primary key default gen_random_uuid(),
  participante_id    uuid not null references participantes(id) on delete cascade,
  agendado_para      timestamptz not null,    -- D0 + 7 dias
  enviado_em         timestamptz,
  respondido_em      timestamptz,
  status             status_followup not null default 'agendado',
  canal              text not null default 'email',  -- 'email' ou 'link_copiado'
  tentativas_envio   int not null default 0
);

create index follow_ups_status_data_idx on follow_ups (status, agendado_para);

-- ---------- VIEW ANALÍTICA: ΔEVA por participante --------------------

-- A análise central do projeto: variação da dor entre D0 e D7,
-- estratificada por escolaridade (chave do "linguagem adaptativa funciona").
create view v_eva_delta as
select
  p.id                                            as participante_id,
  p.idade,
  p.sexo,
  p.raca,
  p.escolaridade,
  case
    when p.escolaridade in (
      'sem_instrucao','fundamental_incompleto','fundamental_completo',
      'medio_incompleto','medio_completo'
    ) then 'baixa'
    when p.escolaridade in (
      'superior_incompleto','superior_completo','pos_graduacao'
    ) then 'alta'
    else null
  end                                             as escolaridade_grupo,
  d0.valor                                        as eva_d0,
  d7.valor                                        as eva_d7,
  (d7.valor - d0.valor)                           as delta_eva,
  d0.registrada_em                                as d0_em,
  d7.registrada_em                                as d7_em
from participantes p
left join eva_medicoes d0
  on d0.participante_id = p.id and d0.momento = 'baseline'
left join eva_medicoes d7
  on d7.participante_id = p.id and d7.momento = 'follow_up_7d'
where p.soft_deleted_em is null;

comment on view v_eva_delta is
  'Análise central: ΔEVA estratificado por escolaridade (baixa vs alta). Insumo para o gráfico do abstract.';

-- ---------- ROW LEVEL SECURITY (LGPD) --------------------------------

-- Por padrão, ninguém lê nada. Permissões são concedidas explicitamente
-- por roles (anon = participante anônimo via API, authenticated = pesquisador,
-- service_role = backoffice).
alter table participantes        enable row level security;
alter table consentimentos_lgpd  enable row level security;
alter table triagens_red_flags   enable row level security;
alter table respostas_clinicas   enable row level security;
alter table eva_medicoes         enable row level security;
alter table pics_uso             enable row level security;
alter table follow_ups           enable row level security;

-- Política: o frontend público (anon) pode INSERIR mas não LER.
-- Pesquisadores autenticados leem tudo. Detalhamento na migration 0002.
