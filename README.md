# Lombar Ativa — Portal Observatório de Saúde

**Projeto piloto NEPP / UNICAMP** — plataforma digital com chatbot adaptativo para autocuidado em **dor lombar crônica inespecífica (CID-10 M54.5)**, com follow-up longitudinal D+7 para pesquisa epidemiológica.

> **Status do MVP:** Fluxo end-to-end funcional. Persistência local em JSON. Migração para Supabase prevista nas próximas iterações. Conteúdo audiovisual ainda a ser produzido pela equipe.

---

## 📚 Documentação

| Documento | Para quem |
|---|---|
| [docs/00 — Checklist de testes](docs/00-checklist-de-testes.md) | Quem está validando o MVP agora |
| [docs/01 — Arquitetura](docs/01-arquitetura.md) | Dev que assume o código |
| [docs/02 — Modelo de dados](docs/02-modelo-de-dados.md) | Pesquisadora + dev |
| [docs/03 — Fluxo do chatbot](docs/03-fluxo-chatbot.md) | Quem ajusta o fluxo conversacional |
| [docs/04 — LGPD & privacidade](docs/04-lgpd-e-privacidade.md) | Coordenação científica + jurídico |
| [docs/05 — Manual operacional](docs/05-manual-operacional.md) | **Quem opera o sistema no dia-a-dia** |
| [docs/06 — Curadoria de conteúdo](docs/06-curadoria-de-conteudo.md) | Supervisão pedagógica |
| [docs/07 — Migração para Supabase](docs/07-migracao-supabase.md) | Dev na transição JSON→Postgres |

## ▶️ Para começar (5 minutos)

Pré-requisitos: **Node.js 20+** e **npm** instalados.

```powershell
cd web
npm install
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000).

Para o checklist de testes do MVP, ver [docs/00-checklist-de-testes.md](docs/00-checklist-de-testes.md).

## 📁 Estrutura do repositório

```
NEPP_MVP_00/
├── web/                     ← Aplicação Next.js (frontend + server actions)
│   ├── src/
│   │   ├── app/             ← Rotas (App Router)
│   │   ├── components/      ← Componentes do site institucional
│   │   └── lib/             ← Repository, chatbot flow, crypto
│   └── .data/               ← (gerado em runtime) JSON com dados coletados
├── db/
│   └── migrations/          ← Schema Postgres versionado (Supabase-ready)
├── docs/                    ← Documentação completa
├── _extracted/              ← Texto extraído dos .docx originais (referência)
└── *.docx, *.html           ← Documentos institucionais e mocks originais
```

## 🛠️ Stack

- **Frontend:** Next.js 15 (App Router) + React 19 + TypeScript
- **Estilo:** Tailwind v4 com tokens institucionais (Unicamp red, NEPP blue, accent gold)
- **Persistência atual:** JSON local via `Repository` interface (drop-in para Supabase)
- **Persistência futura:** Supabase (Postgres + RLS + Edge Functions + pg_cron)
- **Analytics:** Metabase apontando direto para Postgres (após migração)

## 🔬 Equipe institucional

- **Edson Luiz Kitaka** — Coordenação Técnica e Arquitetura de Sistemas
- **Rodrigo Alexander A. Pierini** — Implementação Tecnológica e Governança de Dados
- **Dra. Evelyn Regina Couto** — Coordenação Científica
- **Profa. Dra. Ana Lúcia G. da Silva** — Supervisão Pedagógica
- **Profa. Dra. Ana Maria A. C. da Silva** — Apoio Acadêmico

## ⚖️ Conformidade

LGPD + TCLE. E-mails nunca armazenados em claro (apenas `sha256` + domínio). Detalhes em [docs/04-lgpd-e-privacidade.md](docs/04-lgpd-e-privacidade.md).
