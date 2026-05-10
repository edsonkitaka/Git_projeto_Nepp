# Arquitetura

## Visão de 30 segundos

Aplicação **Next.js 15 (App Router)** monolítica, server-rendered, com **server actions** para mutação. Persistência via **interface Repository** com duas implementações possíveis: JSON local (atual) e Supabase/Postgres (futuro). Sessão do participante via **cookie httpOnly**, nunca via localStorage. E-mails sempre passam por **hash sha256** antes de tocar o disco.

```
┌─────────────────────────────────────────────────────────┐
│                    Cliente (browser)                    │
│  ┌────────────────┐    ┌──────────────────────────────┐ │
│  │ Páginas (RSC)  │    │ Componentes "use client"     │ │
│  │ landing,       │◄──►│ Chatbot, FollowUpForm        │ │
│  │ avaliação,     │    │ (state local em useState)    │ │
│  │ follow-up      │    └────────────┬─────────────────┘ │
│  └────────────────┘                 │                   │
└─────────────────────────────────────┼───────────────────┘
                                      │ Server Actions
                                      ▼
┌─────────────────────────────────────────────────────────┐
│                  Servidor (Next.js)                     │
│  ┌──────────────────┐  ┌──────────────────────────────┐ │
│  │ actions.ts       │─►│ Repository (interface)       │ │
│  │ aceitarTcle,     │  │  ├─ JsonFileRepository (now) │ │
│  │ gravarRedFlags,  │  │  └─ SupabaseRepository (next)│ │
│  │ gravarClinico... │  └──────────────────────────────┘ │
│  └──────────────────┘             │                     │
│            │                      ▼                     │
│            │              ┌───────────────┐             │
│            └─cookie──────►│ .data/db.json │             │
│                           └───────────────┘             │
└─────────────────────────────────────────────────────────┘
```

## Camadas

### 1. Apresentação — `web/src/app/`
- **Server Components** por padrão (todas as `page.tsx`). Renderizam HTML no servidor.
- **Client Components** marcados com `"use client"` apenas onde há estado/interação:
  - [chatbot.tsx](../web/src/app/avaliacao/_components/chatbot.tsx) — state machine do bot
  - [follow-up-form.tsx](../web/src/app/followup/[token]/follow-up-form.tsx) — formulário do D+7
  - [conteudo-adaptativo.tsx](../web/src/app/avaliacao/_components/conteudo-adaptativo.tsx) — render do plano final
- **Tailwind v4** com tokens em [globals.css](../web/src/app/globals.css). Cores institucionais via CSS custom properties (`--color-unicamp-red`, etc.).

### 2. Server Actions — `web/src/app/avaliacao/actions.ts` e `web/src/app/followup/[token]/actions.ts`
Funções `async` marcadas com `"use server"`. São chamadas direto do client component como se fossem funções locais; o Next.js cuida do RPC.

Cada bloco do bot tem uma action:
- `aceitarTcle()` — cria participante + grava consentimento
- `gravarRedFlags(input)` — grava triagem; retorna se encerrou por red flag
- `gravarDemografia(input)` — atualiza idade/sexo/raça/escolaridade no participante
- `gravarClinico(input)` — grava resposta clínica + EVA baseline (transação implícita)
- `gravarPics(input)` — grava uso de PICS
- `agendarFollowUp(input)` — agenda D+7, opcionalmente associa e-mail (hash)
- `gravarEvaFollowUp(token, valor)` — registra EVA D+7 e calcula delta

### 3. Domínio — `web/src/lib/`

```
lib/
├── chatbot/
│   ├── flow.ts        ← state machine (ChatStep, ChatState, inferirHipoteseCid)
│   └── content.ts     ← textos da trilha alta vs baixa escolaridade
├── crypto.ts          ← sha256Hex(input) com salt (env var em prod)
└── db/
    ├── types.ts       ← TypeScript espelhando o schema Postgres
    ├── repository.ts  ← Interface Repository + factory getRepository()
    └── json-repository.ts  ← Implementação JSON
```

### 4. Persistência atual — `web/.data/db.json`

Único arquivo JSON com a estrutura `DatabaseSnapshot`:

```json
{
  "participantes": [...],
  "consentimentos_lgpd": [...],
  "triagens_red_flags": [...],
  "respostas_clinicas": [...],
  "eva_medicoes": [...],
  "pics_uso": [...],
  "follow_ups": [...]
}
```

Limitações conhecidas (aceitáveis para MVP):
- Sem locking — funciona porque só roda em single-process node dev.
- Read/write integral do arquivo a cada operação — volume baixo (centenas de participantes), aceitável.
- Sem migrations — schema é o tipo TypeScript.

A migração para Supabase está coberta em [07-migracao-supabase.md](07-migracao-supabase.md).

## Decisões importantes (e por quê)

### Server Actions em vez de API routes
Server actions evitam a serialização manual REST. O tipo da função é compartilhado entre client e server — refator com confiança. Valida no servidor (TypeScript não chega a runtime, mas a JsonFileRepository valida antes de gravar).

### Cookie httpOnly em vez de sessionStorage
- LGPD: dado em cookie httpOnly não é acessível via JS, blindando contra XSS.
- O `participant_id` em cookie permite o servidor saber quem está respondendo sem expor o id no client.
- Quando a app for migrada para Supabase, podemos trocar o cookie por uma sessão real do Supabase Auth (anônima) sem mexer no fluxo.

### Repository pattern (em vez de chamar SDK Supabase direto nos actions)
Quando trocarmos por Supabase, **só** o arquivo [json-repository.ts](../web/src/lib/db/json-repository.ts) é trocado por um `supabase-repository.ts`. As actions continuam idênticas. Isto é possível porque a interface `Repository` foi desenhada para ser o mínimo denominador comum entre os dois backends.

### Persistência por bloco (e não no final)
Se o usuário fecha o navegador no meio, as respostas que **já** deu ficam gravadas. Isto é importante para análise de **dropout**: queremos saber em que ponto do fluxo as pessoas abandonam.

### State machine no client, persistência no server
O state machine do bot vive **só no client** ([flow.ts](../web/src/lib/chatbot/flow.ts) define os tipos; [chatbot.tsx](../web/src/app/avaliacao/_components/chatbot.tsx) implementa). Cada transição "definitiva" chama uma server action. O servidor é o source of truth dos **dados**; o client é o source of truth da **UI**.

Trade-off: se o usuário recarregar a página no meio do bot, ele recomeça do início (mas o que já gravou no DB persiste). Tolerável para MVP — pode ser melhorado lendo o estado do participante via cookie e pulando steps já preenchidos.

### Hash de PII com salt em env var
[lib/crypto.ts](../web/src/lib/crypto.ts) usa `NEPP_HASH_SALT` (env var). Em dev, fallback para uma string fixa (NÃO USAR EM PROD).

Em produção, definir uma var por ambiente, e **nunca rotacionar** essa var depois de coletar dados — rotacionar invalidaria todos os hashes anteriores e quebraria o de-duplication de e-mails.

## Próximas decisões pendentes

| Tópico | Quando virar urgente |
|---|---|
| Engine de email do follow-up (Resend? Supabase Edge Functions?) | Antes do primeiro estudo real |
| Restauração de step pelo cookie (não recomeçar do zero após F5) | Se análise de dropout mostrar abandono no F5 |
| Internacionalização (PT/EN) | Apenas se houver demanda institucional |
| Logs estruturados (Sentry?) | Antes de subir para servidor Unicamp |
