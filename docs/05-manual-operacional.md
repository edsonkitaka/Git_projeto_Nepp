# Manual operacional

Documento para **quem cuida do sistema no dia-a-dia.** Não pressupõe que você escreveu o código — pressupõe que você herdou o sistema e precisa mantê-lo rodando.

> Última revisão da estrutura: maio/2026.

---

## Sumário

1. [Setup inicial da máquina de operação](#1-setup-inicial)
2. [Rodar localmente (dev)](#2-rodar-localmente-dev)
3. [Build e produção](#3-build-e-produção)
4. [Onde os dados ficam](#4-onde-os-dados-ficam)
5. [Backup e exportação](#5-backup-e-exportação)
6. [Reset / limpeza dos dados](#6-reset--limpeza-dos-dados)
7. [Atualizar conteúdo (textos, perguntas, branding)](#7-atualizar-conteúdo)
8. [Solução de problemas comuns](#8-solução-de-problemas-comuns)
9. [Atualizar dependências](#9-atualizar-dependências)
10. [Quando chamar um dev](#10-quando-chamar-um-dev)

---

## 1. Setup inicial

### Pré-requisitos

| Software | Versão mínima | Como instalar (Windows) |
|---|---|---|
| Node.js | 20.x | [nodejs.org](https://nodejs.org/) — instalar a LTS |
| npm | 10.x | Vem com Node |
| Git | qualquer recente | [git-scm.com](https://git-scm.com/) |
| PowerShell | 5.1+ | Já vem no Windows |

Verificar:

```powershell
node -v   # esperar >= v20
npm -v    # esperar >= 10
git --version
```

### Clonar o projeto

```powershell
cd C:\caminho\onde\quer\manter
git clone <url-do-repositorio> NEPP_MVP_00
cd NEPP_MVP_00
```

### Instalar dependências (uma vez)

```powershell
cd web
npm install
```

Demora ~1 minuto na primeira vez. Cria a pasta `node_modules/` (não commitar — já está no `.gitignore`).

---

## 2. Rodar localmente (dev)

```powershell
cd web
npm run dev
```

Saída esperada:

```
   ▲ Next.js 15.x.x (Turbopack)
   - Local:    http://localhost:3000
   - Ready in 1.8s
```

Abrir [http://localhost:3000](http://localhost:3000).

**Para parar:** `Ctrl+C` no terminal.

**Hot reload:** salvar qualquer arquivo `.tsx` ou `.css` e a página recarrega sozinha.

---

## 3. Build e produção

### Build local (testar se compila)

```powershell
cd web
npm run build
```

Saída esperada termina com `✓ Compiled successfully` e uma tabela com as rotas:

```
Route (app)                     Size     First Load JS
┌ ○ /                           ...
├ ○ /avaliacao                  ...
├ ƒ /followup/[token]           ...
└ ○ /_not-found                 ...
```

`○` = estático, `ƒ` = dinâmico (precisa de servidor Node). Como temos server actions e cookies, **não dá pra fazer export estático puro**.

### Rodar em modo produção localmente

```powershell
npm run build
npm run start
```

A aplicação fica em [http://localhost:3000](http://localhost:3000) **sem hot-reload**, com performance de produção.

### Deploy

Hoje, **não há ambiente de produção configurado.** Quando chegar o momento:

| Ambiente | O que precisa |
|---|---|
| Vercel (mais simples) | Apontar pro repositório, definir `NEPP_HASH_SALT` em env vars; deploy automático em push para `main`. |
| Servidor Unicamp | Node 20 instalado, `npm run build` + `npm run start` atrás de Nginx (proxy reverso na porta 3000). PM2 ou systemd para auto-restart. |

Antes de deploy, ler [07-migracao-supabase.md](07-migracao-supabase.md) — a persistência JSON local **não escala** para produção pública.

---

## 4. Onde os dados ficam

```
web/.data/db.json
```

Este é o **único** arquivo de dados em runtime. Toda a coleta vai pra lá.

Estrutura: ver [02-modelo-de-dados.md](02-modelo-de-dados.md).

Para inspecionar rapidamente:

```powershell
# Ver tudo formatado
Get-Content web\.data\db.json | ConvertFrom-Json | ConvertTo-Json -Depth 10

# Contar participantes
(Get-Content web\.data\db.json | ConvertFrom-Json).participantes.Count

# Listar IDs e idade
(Get-Content web\.data\db.json | ConvertFrom-Json).participantes |
  Select-Object id, idade, escolaridade, criado_em |
  Format-Table
```

---

## 5. Backup e exportação

### Backup manual (recomendado antes de qualquer mudança)

```powershell
$ts = Get-Date -Format "yyyyMMdd-HHmmss"
Copy-Item web\.data\db.json "web\.data\db.backup-$ts.json"
```

### Exportar para CSV (pra Excel / SPSS / R)

PowerShell tem suporte nativo. Exemplo — exportar participantes:

```powershell
(Get-Content web\.data\db.json | ConvertFrom-Json).participantes |
  Export-Csv -Path "export-participantes.csv" -NoTypeInformation -Encoding UTF8
```

Para EVAs (incluindo cálculo de delta), o ideal é **plugar Postgres** e usar a `view v_eva_delta`. Em JSON puro, a operação ficaria manual.

### Backup automatizado (sugestão futura)

Em produção, agendar uma tarefa diária com **Task Scheduler** que copie `db.json` para um cofre externo (OneDrive institucional, GDrive, S3). Implementação fica para fase de produção.

---

## 6. Reset / limpeza dos dados

> ⚠ **Operação destrutiva.** Sempre fazer backup antes (seção 5).

### Limpar tudo (zerar o banco)

```powershell
Remove-Item web\.data\db.json
```

Na próxima requisição, a aplicação cria um arquivo vazio.

### Remover um participante específico (LGPD — Art. 18)

Hoje não há UI. Pra fazer manualmente:

1. Abrir `web\.data\db.json` em editor de texto (VS Code).
2. Localizar o `id` do participante (pode buscar por hash de e-mail se ele forneceu o e-mail original).
3. **Marcar `soft_deleted_em`** com a data ISO atual (preferido) — preserva auditoria mas exclui das análises (a view filtra).
4. Ou remover a linha + todas as linhas filhas (`consentimentos_lgpd`, `triagens_red_flags`, etc.) onde `participante_id` aponta pra ele (delete completo — Art. 16).
5. Salvar.

> Pra LGPD, o **soft-delete é geralmente preferível** — preserva auditoria do consentimento e permite rastreabilidade.

---

## 7. Atualizar conteúdo

### Mudar logos / cores

Cores institucionais estão em [web/src/app/globals.css](../web/src/app/globals.css), bloco `@theme`:

```css
--color-unicamp-red: #8b0000;
--color-nepp-blue: #003366;
--color-accent-gold: #ffd700;
```

Editar e salvar — o site recarrega automaticamente em dev. Em produção, exige novo `npm run build`.

### Mudar texto da landing

[web/src/app/page.tsx](../web/src/app/page.tsx) (título, subtítulo, cards) — strings inline.

### Mudar perguntas do bot

Strings inline em [chatbot.tsx](../web/src/app/avaliacao/_components/chatbot.tsx). Procurar pelo texto e editar. Para mudanças estruturais (adicionar/remover pergunta), ver [03-fluxo-chatbot.md](03-fluxo-chatbot.md).

### Mudar conteúdo adaptativo

Os textos das duas trilhas estão em [web/src/lib/chatbot/content.ts](../web/src/lib/chatbot/content.ts). Ver guia em [06-curadoria-de-conteudo.md](06-curadoria-de-conteudo.md).

### Atualizar o TCLE

Ver [04-lgpd-e-privacidade.md, seção "Atualizar o TCLE"](04-lgpd-e-privacidade.md#atualizar-o-tcle).

---

## 8. Solução de problemas comuns

### "Erro `EADDRINUSE` na porta 3000"

Outra aplicação está usando a porta. Matar:

```powershell
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force
```

Ou usar outra porta:

```powershell
$env:PORT=3001; npm run dev
```

### "Tela em branco"

1. Abrir DevTools (F12) → Console.
2. Procurar erro em vermelho.
3. Erro com `cookies()` ou `headers()` → algum `await` faltou em código de servidor.
4. Erro com `Hydration` → desencontro entre servidor e client. Verificar se algum componente client está usando `Date.now()` ou `Math.random()` no render.

### "Não persiste dados"

1. Verificar permissão de escrita em `web\.data\`.
2. Verificar se o disco não está cheio.
3. Em produção atrás de proxy: a pasta `.data/` precisa estar **dentro** do volume persistente. Se for container Docker, montar volume.

### "Erro de Tailwind: `Missing field 'negated'`"

Ver [00-checklist-de-testes.md, seção "Defeitos comuns"](00-checklist-de-testes.md#defeitos-comuns-a-procurar). Solução: atualizar Tailwind.

### "Erro `Participante <uuid> não encontrado` após apagar o JSON"

Causado por **cookie órfão**: você apagou `web/.data/db.json` mas o browser ainda tem o cookie `lombar_participant_id` apontando pro ID antigo.

A aplicação já valida isso desde o fix de maio/2026 — se o ID do cookie não existe no banco, cria um participante novo automaticamente.

Se mesmo assim você quiser limpar o cookie manualmente:
- DevTools → Application → Cookies → http://localhost:3000 → deletar `lombar_participant_id`
- Ou usar **Clear site data** no DevTools.

### "Como vejo os logs?"

Em dev, todos os logs vão pro terminal onde rodou `npm run dev`.

Em produção (futuro), depende do gestor de processos:
- PM2: `pm2 logs lombar-ativa`
- systemd: `journalctl -u lombar-ativa -f`
- Vercel: dashboard web → Logs

---

## 9. Atualizar dependências

### Verificar o que está desatualizado

```powershell
cd web
npm outdated
```

### Atualizar com cautela (preferido)

```powershell
npm update              # respeita os ranges do package.json (ex.: ^4.1.0)
npm run build           # confirmar que continua compilando
npm run dev             # smoke test manual
```

### Atualizar major (cuidado)

```powershell
npm install next@latest react@latest react-dom@latest
```

Major bumps de Next, React ou Tailwind exigem revisão completa do projeto. **Chamar um dev.**

### Após atualizar — sempre

1. Rodar [00-checklist-de-testes.md](00-checklist-de-testes.md) inteiro.
2. Commit do `package.json` e do `package-lock.json`.

---

## 10. Quando chamar um dev

Você pode resolver sozinho:
- Restartar a app
- Fazer backup
- Editar textos institucionais (logos, cores, perguntas)
- Atualizar conteúdo adaptativo (textos, vídeos, áudios) com `npm run dev` aberto pra confirmar visual
- Rodar checklist de testes
- Aplicar `npm update`

Chamar um dev quando:
- Mudança de **schema** do banco (adicionar tabela, mudar tipo)
- Adicionar/remover **steps do bot**
- Migração JSON → Supabase
- **Erro persistente** que não resolve com restart
- Update de **major** (Next/React/Tailwind)
- Auditoria de **segurança/LGPD**

Documentar todo problema novo encontrado neste documento, na seção 8.
