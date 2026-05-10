# Checklist de testes — MVP Lombar Ativa

Lista de verificações manuais para validar o fluxo end-to-end antes de apresentar à equipe ou subir um deploy.

> Tempo estimado: **15–20 minutos**.

---

## Antes de começar

1. Apagar dados antigos para começar do zero:
   ```powershell
   Remove-Item web\.data\db.json -ErrorAction SilentlyContinue
   ```
2. Subir o servidor:
   ```powershell
   cd web; npm run dev
   ```
3. Abrir o **DevTools** (F12 → Application → Cookies) — útil para verificar o cookie `lombar_participant_id`.
4. Em outra aba, deixar aberto o arquivo `web/.data/db.json` (ou um `Get-Content -Wait` no PowerShell) para ver o JSON crescer em tempo real.

---

## ✅ T1 — Golden path (alta escolaridade)

Objetivo: validar o fluxo completo + render técnico-científico.

1. Acessar [http://localhost:3000](http://localhost:3000).
2. Clicar em **Começar avaliação** → vai para `/avaliacao`.
3. Aceitar o TCLE.
4. Responder **Não** para todas as 7 red flags.
5. Idade: **45**.
6. Sexo: **Masculino** (ou outro).
7. Raça: **Parda**.
8. Escolaridade: **Superior** ou **Pós-graduação**.
9. Localização: **Apenas na lombar**.
10. Gatilho: **Ficar muito tempo em pé**.
11. Comorbidades: marcar **Diabetes** e **Hipertensão**, clicar **Confirmar**.
12. Estado emocional: marcar **Estressado**, clicar **Confirmar**.
13. EVA D0: clicar em **7**.
14. PICS histórico: **Já fiz no passado**.
15. Áudio: **Sim, quero ouvir**.
16. E-mail: deixar **vazio** → clicar **Continuar sem e-mail**.

**Esperado:**
- Aparece bloco "Plano técnico" com título *"A neurofisiologia da cronicidade: entendendo a sensibilização central"* — texto do trilho ALTA.
- Aparece bloco amarelo de follow-up com **link copiável** (`/followup/<uuid>`).
- Botão **Copiar** → muda o label para "Copiado!".

**Verificar no JSON (`web/.data/db.json`):**
- 1 entrada em `participantes` com `idade: 45`, `escolaridade: "superior_completo"` (ou similar), `email_hash: null`, `email_dominio: null`.
- 1 entrada em `consentimentos_lgpd`.
- 1 entrada em `triagens_red_flags` com `encerrado_por_red_flag: false`.
- 1 entrada em `respostas_clinicas` com `hipotese_cid10: "M54.5"`.
- 1 entrada em `eva_medicoes` com `momento: "baseline"`, `valor: 7`.
- 1 entrada em `pics_uso`.
- 1 entrada em `follow_ups` com `agendado_para` ≈ 7 dias no futuro, `canal: "link_copiado"`.

---

## ✅ T2 — Golden path (baixa escolaridade) com e-mail

Objetivo: validar o render adaptativo e a captura de e-mail.

> ℹ Não é mais necessário limpar cookies — aceitar o TCLE de novo já cria um novo participante automaticamente. (Manter o cookie limpo é útil só pra testar o cenário "primeira visita".)

1. Recarregar a página `/avaliacao`.
2. Repetir o fluxo, mas:
   - Escolaridade: **Fundamental** ou **Médio**.
   - Localização: **Lombar que desce para as pernas**.
   - E-mail: **`teste@gmail.com`**.

**Esperado:**
- Bloco final mostra **"O movimento é o seu melhor remédio"** — texto da trilha BAIXA com a metáfora do alarme de carro.
- Aparece o **bloco de vídeo** (preto) "Alongamento Gato-Camelo" — só aparece na trilha BAIXA.
- Mensagem: *"Te lembraremos por e-mail."*

**Verificar no JSON:**
- `respostas_clinicas[1].hipotese_cid10` = **`"M54.4"`** (lombociatalgia, porque a dor desce pra perna).
- `participantes[1].email_hash` = string hex de 64 chars. **Nunca o e-mail em claro.**
- `participantes[1].email_dominio` = `"gmail.com"`.
- `follow_ups[1].canal` = `"email"`.

---

## ✅ T3 — Red flag interrompe o fluxo

Objetivo: garantir que urgências médicas barram o autocuidado.

1. Limpar cookies, recomeçar.
2. Aceitar TCLE.
3. Na primeira red flag (**trauma recente**), responder **Sim**.
4. Continuar respondendo as outras (qualquer combinação).

**Esperado:**
- Após a 7ª pergunta, aparece a mensagem de alerta vermelha:
  *"⚠ Algumas das suas respostas indicam que você precisa de avaliação médica presencial..."*
- O fluxo **PARA** — não há próximo passo.
- A mensagem orienta procurar UBS / pronto-socorro.

**Verificar no JSON:**
- `triagens_red_flags[N].encerrado_por_red_flag` = `true`.
- `triagens_red_flags[N].trauma_recente` = `true`.
- **Não há** `respostas_clinicas` nem `eva_medicoes` para esse participante.

---

## ✅ T4 — Follow-up D+7 (caminho do link)

Objetivo: validar a reavaliação e o cálculo de ΔEVA.

1. Após T1 ou T2, copiar o link de follow-up que apareceu (ex.: `http://localhost:3000/followup/abc-123`).
2. Abrir esse link em **outra aba** (qualquer navegador / aba anônima — não precisa do mesmo cookie).
3. A página deve carregar com o título **"Reavaliação após 7 dias"**.
4. Clicar em um valor de EVA — por exemplo, **3** (se T1 deu 7, esperar redução).
5. Clicar **Registrar reavaliação**.

**Esperado:**
- Mensagem de sucesso. Se valor < EVA D0, mensagem em destaque: *"Houve melhora de N ponto(s)…"*.
- Se valor > EVA D0: *"A dor aumentou em N ponto(s)…"*.
- Se valor = EVA D0: *"A intensidade ficou estável."*

**Verificar no JSON:**
- `eva_medicoes` agora tem 2 entradas para o mesmo `participante_id`: uma `baseline`, outra `follow_up_7d`.
- `follow_ups[idx].status` = `"respondido"`.
- `follow_ups[idx].respondido_em` = timestamp de agora.

---

## ✅ T5 — Token inválido = 404

1. Abrir `http://localhost:3000/followup/token-que-nao-existe`.

**Esperado:** página 404 do Next.js (sem vazar nada do banco).

---

## ✅ T6 — Não permite EVA duplicada

1. Após T4, voltar ao mesmo link de follow-up.
2. Tentar registrar outro valor de EVA.

**Esperado:** mensagem de erro vermelha *"EVA já registrada para participante … no momento follow_up_7d"*. (A constraint UNIQUE do schema é replicada na implementação JSON.)

---

## ✅ T7 — Acessibilidade básica (teclado)

1. Em qualquer tela, navegar **só com Tab / Shift+Tab**.
2. Pressionar **Enter** ou **Espaço** em cada botão.

**Esperado:**
- Foco sempre visível (anel azul de 3px).
- Todos os botões e o input acessíveis sem mouse.
- Ordem de tabulação faz sentido (não pula nada relevante).

---

## ✅ T8 — Acessibilidade (mobile)

1. F12 → Toggle device toolbar → escolher iPhone SE (375 px) ou similar.
2. Refazer T1.

**Esperado:**
- Tudo renderiza sem scroll horizontal.
- Botões com altura mínima 44px (toque confortável).
- Texto base mínimo 18px.

---

## ✅ T9 — Persistência sobrevive a F5

1. Iniciar T1 mas parar **logo após responder Idade**.
2. Apertar **F5**.

**Esperado:**
- O cookie `lombar_participant_id` persiste (verificar em DevTools).
- O participante já está criado no JSON, com `idade: 45` mas demais campos `null`.
- O fluxo do bot **recomeça do início** (estado de UI é local, é esperado), mas dados antigos ficam no JSON. *Comportamento documentado — pode ser melhorado em fase futura com restauração de step pelo cookie.*

---

## ✅ T10 — Build de produção compila

```powershell
cd web
npm run build
```

**Esperado:** sem erros, sem warnings de TypeScript bloqueantes. Saída deve listar as 4 rotas: `/`, `/avaliacao`, `/followup/[token]`, mais o 404.

---

## Defeitos comuns a procurar

| Sintoma | Causa provável |
|---|---|
| Erro `Missing field 'negated' on ScannerOptions.sources` | Tailwind 4.0.x — atualizar para 4.1+ (`npm i tailwindcss@^4.1 @tailwindcss/postcss@^4.1`) |
| Erro `cookies() should be awaited` | Esquecemos um `await` em `cookies()` numa server action — Next 15 mudou a API |
| Email aparece em claro no JSON | Bug grave — o `aceitarTcle` ou `agendarFollowUp` está pulando o hash. Conferir [lib/crypto.ts](../web/src/lib/crypto.ts) |
| Trilha errada no render adaptativo | `escolaridadeGrupo()` em [lib/db/types.ts](../web/src/lib/db/types.ts) — verificar o mapeamento baixa/alta |
| Participante duplicado a cada visita | O cookie não está sendo lido — verificar `cookies().get(COOKIE_NAME)` |
| Erro `Participante <uuid> não encontrado` | Cookie órfão após apagar `.data/db.json`. Resolvido em `requireParticipantId` — basta recarregar a página e aceitar o TCLE de novo |
| Erro `EVA já registrada para participante ... no momento baseline` | Tentativa de rodar o fluxo 2x para o mesmo participante. Resolvido — `aceitarTcle` agora sempre cria participante novo |
| Erro `Sessão não iniciada — aceite o TCLE primeiro` | Action chamada antes de `aceitarTcle`. Em fluxo normal não acontece; se aparecer, é bug de ordem de chamada |
