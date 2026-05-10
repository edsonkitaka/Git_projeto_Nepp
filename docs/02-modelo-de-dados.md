# Modelo de dados

Documento para **dev** e **pesquisadora**. Explica cada tabela, cada enum e a lógica analítica do Observatório.

---

## Visão geral

```
participantes  ──┬── consentimentos_lgpd      (versionado por TCLE)
   (anônimo)    ├── triagens_red_flags        (encerra fluxo se urgência)
                ├── respostas_clinicas        (CID, gatilho, comorbidades)
                ├── eva_medicoes              (D0 e D7 — uma por momento)
                ├── pics_uso                  (práticas integrativas)
                └── follow_ups                (agenda do D+7)

VIEW v_eva_delta  ─── ΔEVA por escolaridade_grupo (insumo p/ análise)
```

O schema canônico está em SQL versionado em [db/migrations/](../db/migrations/). A implementação TypeScript do mesmo schema (para o JSON repo atual) está em [web/src/lib/db/types.ts](../web/src/lib/db/types.ts).

---

## Tabelas

### `participantes`

Sujeito de pesquisa anônimo. **Não há nome, CPF, telefone**. Pode ter um e-mail, mas só na forma de hash sha256 + domínio.

| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid | gerado |
| `criado_em` | timestamptz | UTC |
| `idade` | int | 0–120, opcional |
| `sexo` | enum `sexo_biologico` | feminino/masculino/intersexo/nao_informado |
| `raca` | enum `raca_cor` | seguindo IBGE |
| `etnia_livre` | text | campo aberto opcional (ex.: "quilombola") |
| `escolaridade` | enum `escolaridade` | seguindo PNAD |
| `email_hash` | bytea | sha256(salt + email_normalizado) |
| `email_dominio` | text | "gmail.com", "outlook.com" — útil pra cohort sem PII |
| `follow_up_token` | uuid | token aleatório do link D+7 |
| `soft_deleted_em` | timestamptz | LGPD: pedido de remoção marca aqui |

> **Por que separar `email_hash` e `email_dominio`?** O hash permite **identificar o participante de volta** (se ele clicar no link D+7 ou voltar ao site, podemos reconciliar). O domínio sozinho permite análise de cohort (ex.: "60% dos participantes usam Gmail") sem expor PII.

### `consentimentos_lgpd`

Histórico **versionado**. Quando o TCLE for atualizado, criamos uma nova linha — não sobrescrevemos a anterior. Auditoria essencial pra LGPD.

| Campo | Notas |
|---|---|
| `versao_tcle` | string semver-like, ex.: `"v1.0-2026-05"` |
| `aceito_em` | timestamp |
| `ip_hash` | hash do IP (não o IP) |
| `user_agent` | string completa do browser |
| `revogado_em` | preenchido se o usuário revogar consentimento depois |

### `triagens_red_flags`

Triagem para excluir **urgências médicas**. Se qualquer flag = `true`, o fluxo encerra com orientação para procurar atendimento presencial.

Red flags clássicas para dor lombar (NICE 2016 / NHS):
- `trauma_recente`
- `perda_peso_inexplicada`
- `febre_persistente`
- `incontinencia_urinaria`
- `dor_noturna_intensa`
- `fraqueza_progressiva`
- `historico_cancer`

A coluna `encerrado_por_red_flag` é **derivada** (`generated always as ... stored` no Postgres) — a flag final é calculada pelo banco, não confiável no client.

### `respostas_clinicas`

| Campo | Notas |
|---|---|
| `localizacao_dor` | "lombar_apenas", "lombar_pernas", "lombar_quadril" |
| `gatilho` | "tempo_em_pe", "carregar_peso", "tossir_espirrar"... |
| `comorbidades_cid10` | array de códigos CID-10 (ex.: `{E11, I10}`) |
| `estado_emocional` | array (ex.: `{ansioso, estressado}`) |
| `hipotese_cid10` | calculado: pernas → M54.4, demais → M54.5 |
| `notas` | reservado para versões futuras com texto livre |

> **A `hipotese_cid10` NÃO é um diagnóstico médico.** É um rótulo para coorte epidemiológica. Documentar isso em qualquer publicação.

### `eva_medicoes`

Escala Visual Analógica (0-10). Constraint **UNIQUE (participante, momento)** — só uma medição por momento por participante.

| `momento` | Quando |
|---|---|
| `baseline` | D0 — coletado no fim do bot |
| `follow_up_7d` | D7 — coletado em `/followup/[token]` |

> **`ΔEVA` não é coluna — é view.** Calcular delta como coluna abriria caminho pra inconsistência se o D0 fosse corrigido. A view [v_eva_delta](#view-v_eva_delta) faz o cálculo dinâmico.

### `pics_uso`

| `historico` | Significado |
|---|---|
| `nunca_usou` | nunca usou PICS |
| `ja_usou_passado` | usou no passado, não usa hoje |
| `usa_atualmente` | usa hoje |

`praticas`: array (`{meditacao, yoga, acupuntura}`). `acessou_audio`: booleano — true se ouviu a meditação guiada **dentro do portal**.

### `follow_ups`

Agenda do D+7. Em produção, um pg_cron move linhas de `agendado` para `enviado` 7 dias após o D0, dispara e-mail (Edge Function), e marca como `respondido` quando o usuário submete o EVA D+7.

| `status` | Quando |
|---|---|
| `agendado` | criado, ainda não vencido |
| `enviado` | e-mail disparado |
| `respondido` | usuário registrou EVA D+7 |
| `expirado` | passou de 14 dias sem resposta |
| `cancelado` | usuário pediu remoção (LGPD) |

---

## Enums

### `escolaridade` (PNAD/IBGE)

```
sem_instrucao
fundamental_incompleto, fundamental_completo
medio_incompleto, medio_completo
superior_incompleto, superior_completo
pos_graduacao
```

**Agrupamento analítico** (calculado em view e em [lib/db/types.ts](../web/src/lib/db/types.ts) via `escolaridadeGrupo()`):
- **baixa** = `sem_instrucao` ou qualquer nível até `medio_completo`
- **alta** = `superior_*` ou `pos_graduacao`

A divisão em "baixa/alta" é o coração do estudo: prova ou refuta a hipótese de que **linguagem adaptativa produz desfechos clínicos equivalentes** entre estratos de letramento.

### `raca_cor` (IBGE)

`branca`, `preta`, `parda`, `amarela`, `indigena`, `nao_declarada`.

> Use estes códigos exatos em qualquer análise — alinha com Censo IBGE para comparabilidade.

### `momento_eva`

`baseline` | `follow_up_7d`

### `uso_pics`

`nunca_usou` | `ja_usou_passado` | `usa_atualmente`

---

## View `v_eva_delta`

A consulta central do Observatório:

```sql
SELECT
  participante_id,
  idade, sexo, raca, escolaridade,
  escolaridade_grupo,        -- 'baixa' ou 'alta'
  eva_d0, eva_d7,
  delta_eva                  -- d7 - d0
FROM v_eva_delta
WHERE eva_d0 IS NOT NULL AND eva_d7 IS NOT NULL;
```

Esta view alimenta o gráfico do abstract (ver [exemplo para apresentação de resultados](../_extracted/exemplo%20para%20apresenta%C3%A7ao%20de%20resultados%20nepp.txt)):

> *"Eficácia de um portal digital com linguagem adaptativa no manejo da dor lombar crônica: redução média de ΔEVA = -3.6 (baixa escolaridade) vs ΔEVA = -3.7 (alta escolaridade), p = 0.65 — desfechos equivalentes."*

---

## Segurança (RLS)

Em Postgres com Supabase, as policies estão em [0002_rls_policies.sql](../db/migrations/0002_rls_policies.sql):

- `anon` (frontend público) — só **INSERT**, nunca SELECT.
- `authenticated` (pesquisador) — SELECT em tudo.
- `service_role` (backoffice) — irrestrito; usado por jobs de cron.

A implementação JSON atual **não tem RLS** — não há autenticação. Esta é a principal razão pela qual a app deve migrar para Supabase antes de qualquer estudo público.

---

## Como fazer queries comuns

### "Quantos participantes completaram o D+7?"

```sql
SELECT count(*)
FROM follow_ups
WHERE status = 'respondido';
```

### "ΔEVA médio por escolaridade_grupo"

```sql
SELECT
  escolaridade_grupo,
  count(*) AS n,
  avg(delta_eva) AS delta_medio,
  stddev(delta_eva) AS desvio
FROM v_eva_delta
WHERE delta_eva IS NOT NULL
GROUP BY escolaridade_grupo;
```

### "% de adesão a PICS por escolaridade"

```sql
SELECT
  p.escolaridade,
  count(*) FILTER (WHERE pics.acessou_audio) * 100.0 / count(*) AS pct_adesao
FROM participantes p
LEFT JOIN pics_uso pics ON pics.participante_id = p.id
WHERE p.soft_deleted_em IS NULL
GROUP BY p.escolaridade;
```

### "Distribuição de hipóteses CID por raça"

```sql
SELECT p.raca, rc.hipotese_cid10, count(*)
FROM participantes p
JOIN respostas_clinicas rc ON rc.participante_id = p.id
GROUP BY p.raca, rc.hipotese_cid10
ORDER BY 1, 3 DESC;
```
