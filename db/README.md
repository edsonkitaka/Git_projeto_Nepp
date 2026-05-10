# Banco de dados — Lombar Ativa

Schemas Postgres para o **Observatório de Saúde NEPP/UNICAMP**.

## Estrutura

```
db/
├── migrations/
│   ├── 0001_initial_schema.sql   ← Tabelas, enums, view analítica, RLS habilitado
│   └── 0002_rls_policies.sql     ← Políticas RLS (anon insert / authenticated read)
└── README.md
```

## Modelo de dados

```
participantes (id anônimo, demografia, e-mail HASH p/ D+7)
├─ consentimentos_lgpd       (versionado — auditoria do TCLE)
├─ triagens_red_flags        (encerra fluxo se urgência detectada)
├─ respostas_clinicas        (localização, gatilho, comorbidades CID-10, hipótese)
├─ eva_medicoes              (D0 + D7 — uma linha por momento)
├─ pics_uso                  (histórico + acesso ao áudio do portal)
└─ follow_ups                (agenda D+7 — consumida por pg_cron)

VIEW v_eva_delta             ← ΔEVA por escolaridade_grupo (baixa/alta)
```

## Decisões de design importantes

- **Anonimato**: e-mail nunca armazenado em claro — apenas `sha256(email)` + domínio. Permite disparar follow-up sem PII visível em queries analíticas.
- **Enums tipados** em vez de strings livres (escolaridade segue PNAD/IBGE; raça/cor segue IBGE).
- **ΔEVA é view, não coluna** — evita drift entre coluna e dados-fonte.
- **RLS default-deny**: anon só insere; pesquisador autenticado lê tudo.
- **`generated always as ... stored`** na red flag — `encerrado_por_red_flag` é derivado, nunca inconsistente.

## Como aplicar (Supabase)

Numa instância Supabase nova:

```bash
# Via Supabase CLI
supabase link --project-ref <seu-ref>
supabase db push

# Ou direto no SQL Editor do dashboard
# Cole 0001 → run; cole 0002 → run.
```

## Próximas migrations previstas

- `0003_rpc_followup_token.sql` — função `submit_followup_eva(token, valor)` com `security definer` para o D+7.
- `0004_seed_dev.sql` — dados fictícios para desenvolvimento (NÃO rodar em prod).
- `0005_pg_cron_followup.sql` — job que move follow-ups de `agendado` → `enviado`.
