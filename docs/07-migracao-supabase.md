# Migração para Supabase

Guia para o **dev** que vai trocar a persistência JSON local por Postgres no Supabase. Tarefa prevista para acontecer **antes do primeiro estudo público**.

---

## Por que migrar

| Limitação atual (JSON) | Resolvido com Supabase |
|---|---|
| Sem locking — corre risco com múltiplos requests | Postgres faz transações reais |
| Sem RLS — frontend público teria acesso total | RLS já desenhado em [0002_rls_policies.sql](../db/migrations/0002_rls_policies.sql) |
| Sem job de email D+7 | pg_cron + Edge Functions disparam o follow-up |
| Difícil exportar pra ferramentas analíticas | Metabase/Grafana plugam direto |
| Backup manual via cópia de arquivo | Backup automatizado pelo Supabase |
| Não escala além de ~mil participantes | Postgres aguenta milhões |

---

## Plano de migração

### Etapa 1 — Provisionar Supabase

1. Criar conta em [supabase.com](https://supabase.com) (free tier basta para o piloto).
2. Criar projeto. Escolher região **South America (São Paulo)** — latência baixa.
3. Anotar:
   - URL do projeto: `https://<ref>.supabase.co`
   - `anon` key (pública)
   - `service_role` key (privada — só servidor)

### Etapa 2 — Aplicar migrations

No SQL Editor do dashboard Supabase:

1. Colar [`db/migrations/0001_initial_schema.sql`](../db/migrations/0001_initial_schema.sql) → Run.
2. Colar [`db/migrations/0002_rls_policies.sql`](../db/migrations/0002_rls_policies.sql) → Run.
3. Conferir no Table Editor que as 7 tabelas + view `v_eva_delta` apareceram.

Alternativamente, via CLI:

```powershell
npm install -g supabase
supabase login
cd db
supabase link --project-ref <seu-ref>
supabase db push
```

### Etapa 3 — Criar `SupabaseRepository`

Criar arquivo `web/src/lib/db/supabase-repository.ts` implementando `Repository`:

```ts
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Repository } from "./repository";
import type { Participante, /* ... */ } from "./types";

export class SupabaseRepository implements Repository {
  private client: SupabaseClient;

  constructor() {
    const url = process.env.SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;  // service role nas server actions
    this.client = createClient(url, key, { auth: { persistSession: false } });
  }

  async createParticipante(data) {
    const { data: row, error } = await this.client
      .from("participantes")
      .insert({ ...data })  // criado_em e follow_up_token são default no DB
      .select()
      .single();
    if (error) throw error;
    return row as Participante;
  }

  // ... demais métodos espelhando a interface
}
```

Adicionar dependência:

```powershell
cd web
npm install @supabase/supabase-js
```

### Etapa 4 — Plugar no factory

Editar [`web/src/lib/db/repository.ts`](../web/src/lib/db/repository.ts):

```ts
export async function getRepository(): Promise<Repository> {
  if (cached) return cached;

  if (process.env.DB_DRIVER === "supabase") {
    const { SupabaseRepository } = await import("./supabase-repository");
    cached = new SupabaseRepository();
  } else {
    const { JsonFileRepository } = await import("./json-repository");
    cached = new JsonFileRepository();
  }
  return cached;
}
```

### Etapa 5 — Configurar env vars

Criar `web/.env.local` (não commitar):

```env
DB_DRIVER=supabase
SUPABASE_URL=https://<ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
NEPP_HASH_SALT=<gerado com openssl rand -hex 32>
```

Para deploy em Vercel/servidor, definir essas variáveis no painel do provedor — **nunca** commitar a service_role key.

### Etapa 6 — Testar

Rodar [00-checklist-de-testes.md](00-checklist-de-testes.md) inteiro contra o Supabase. Tudo deve funcionar **idêntico** ao JSON — se algo divergir, é bug do `SupabaseRepository`.

### Etapa 7 — Migrar dados existentes (opcional)

Se já houver dados no `web/.data/db.json` que precisam preservar:

```ts
// scripts/migrate-json-to-supabase.ts
import { JsonFileRepository } from "@/lib/db/json-repository";
import { SupabaseRepository } from "@/lib/db/supabase-repository";

const json = new JsonFileRepository();
const sb = new SupabaseRepository();

// ler todos os participantes do JSON e re-inserir no Supabase
// ATENÇÃO: re-inserir mantém os UUIDs originais? — sim, se passar id explicitamente
```

Como o volume do MVP é baixo, talvez seja mais simples zerar e começar limpo no Supabase.

---

## Etapa 8 — Configurar follow-up automatizado

### Edge Function pra enviar e-mail D+7

Criar função em `supabase/functions/send-followup-emails/index.ts` (Supabase CLI):

```ts
import { createClient } from "@supabase/supabase-js";

Deno.serve(async () => {
  const sb = createClient(Deno.env.get("SB_URL")!, Deno.env.get("SB_SERVICE_KEY")!);

  const { data: pendentes } = await sb
    .from("follow_ups")
    .select("*, participantes(email_hash, follow_up_token)")
    .eq("status", "agendado")
    .lt("agendado_para", new Date().toISOString());

  for (const f of pendentes ?? []) {
    // Como o e-mail é só hash, precisamos de outro caminho:
    // OPÇÃO A: armazenar e-mail criptografado (não hash) — exige nova coluna
    // OPÇÃO B: usar Resend/SendGrid e armazenar destinatário em tabela separada
    //          com retenção curta (descartada após envio)
    //
    // RECOMENDADO: opção B com retenção máxima de 14 dias.
  }

  return new Response("ok");
});
```

> ⚠ **Esta é uma decisão de design pendente.** O hash sha256 é one-way: não conseguimos recuperar o e-mail original pra disparar a mensagem. As alternativas são:
>
> - **A — Encriptar com chave reversível** (AES) — viola o princípio "PII só como hash". Não recomendado.
> - **B — Tabela separada com retenção curta** (`follow_up_emails(participante_id, email_em_claro, expira_em)`) com `DELETE` automático após envio bem-sucedido ou após 14 dias. **Recomendado.**
> - **C — Não enviar e-mail; só link copiável** — o que está implementado hoje. Reduz adesão ao D+7.
>
> Discutir com Sr. Edson e Sr. Rodrigo antes de implementar.

### Cron pra disparar a Edge Function

```sql
-- via dashboard Supabase → Database → Cron Jobs
SELECT cron.schedule(
  'send-followup-emails',
  '0 9 * * *',  -- todo dia às 09:00 UTC = 06:00 BRT
  $$
    SELECT net.http_post(
      url := 'https://<ref>.functions.supabase.co/send-followup-emails',
      headers := '{"Authorization": "Bearer <internal-token>"}'::jsonb
    );
  $$
);
```

---

## Etapa 9 — Plugar Metabase

1. Subir Metabase localmente (Docker) ou usar Metabase Cloud.
2. Conectar ao Postgres do Supabase usando a URL de connection (Database → Connect):
   ```
   postgresql://postgres:<senha>@db.<ref>.supabase.co:5432/postgres
   ```
3. No Metabase, criar dashboard com queries baseadas na view `v_eva_delta`:
   - Gráfico EVA D0 vs D7 estratificado por escolaridade_grupo
   - Heatmap de adesão a PICS por região (se coletado)
   - Funil de conversão: TCLE → demografia → clínico → PICS → follow-up

A view `v_eva_delta` já está preparada para reproduzir o gráfico do abstract científico.

---

## Etapa 10 — Apagar o JsonFileRepository (opcional)

Após Supabase em produção e dados migrados, pode-se:

1. Apagar `web/src/lib/db/json-repository.ts`.
2. Apagar a alternativa do factory em `repository.ts` (manter só o caminho Supabase).
3. Apagar `web/.data/` do `.gitignore`.

**Recomendação:** manter o `JsonFileRepository` para dev local sem internet — útil pra novo dev rodar o projeto sem precisar de credenciais Supabase. Custo zero de manutenção.

---

## Riscos e gotchas

| Risco | Mitigação |
|---|---|
| RLS bloquear inserts do frontend | Não use a anon key direto no client — use service_role nas server actions |
| Custo Supabase explodir | Free tier dá 500MB DB + 1GB storage. Setar alertas de uso |
| Rotação acidental do `NEPP_HASH_SALT` | Documentar a string em cofre institucional. Nunca rotacionar após coleta começar |
| Backup do Supabase | Free tier faz backup diário (7 dias retenção). Pra mais, plano Pro. Considerar `pg_dump` periódico em servidor Unicamp |
| Latência (Supabase em SP, usuários em SP) | <50ms — não é problema |
| Lock-in | Postgres é portável. Se sair do Supabase, `pg_dump` → restore em qualquer Postgres |
