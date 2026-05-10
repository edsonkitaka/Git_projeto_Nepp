# Fluxo do chatbot

State machine do bot unificado (`/avaliacao`). Documento para quem precisa **alterar o fluxo conversacional** — adicionar uma pergunta, reordenar, mudar o texto de uma bolha.

---

## Arquivos relevantes

| Arquivo | Papel |
|---|---|
| [lib/chatbot/flow.ts](../web/src/lib/chatbot/flow.ts) | Tipo `ChatStep`, `ChatState`, estado inicial, lógica de inferência CID |
| [lib/chatbot/content.ts](../web/src/lib/chatbot/content.ts) | Textos da trilha **alta** vs **baixa** escolaridade |
| [app/avaliacao/_components/chatbot.tsx](../web/src/app/avaliacao/_components/chatbot.tsx) | Implementação do state machine + UI |
| [app/avaliacao/actions.ts](../web/src/app/avaliacao/actions.ts) | Persistência (uma action por bloco) |

---

## Diagrama de estados

```
                ┌─────────┐
                │  lgpd   │
                └────┬────┘
                     ▼
              ┌──────────────┐    qualquer Sim    ┌─────────────────┐
              │  red_flags   │───────────────────▶│ red_flag_stop   │ (terminal)
              └────┬─────────┘                    └─────────────────┘
       todas Não   │
                   ▼
        ┌────────────────────┐
        │ demografia_idade   │
        └─────────┬──────────┘
                  ▼
        ┌────────────────────┐
        │ demografia_sexo    │
        └─────────┬──────────┘
                  ▼
        ┌────────────────────┐
        │ demografia_raca    │
        └─────────┬──────────┘
                  ▼
        ┌──────────────────────────┐
        │ demografia_escolaridade  │ ──► gravarDemografia()
        └─────────┬────────────────┘
                  ▼
        ┌────────────────────────┐
        │ clinico_localizacao    │
        └─────────┬──────────────┘
                  ▼
        ┌────────────────────────┐
        │ clinico_gatilho        │
        └─────────┬──────────────┘
                  ▼
        ┌────────────────────────┐
        │ clinico_comorbidades   │ (multi-choice)
        └─────────┬──────────────┘
                  ▼
        ┌────────────────────────┐
        │ clinico_emocional      │ (multi-choice)
        └─────────┬──────────────┘
                  ▼
        ┌────────────────────────┐
        │ clinico_eva_d0         │ ──► gravarClinico()  (clínico + EVA baseline)
        └─────────┬──────────────┘
                  ▼
        ┌────────────────────────┐
        │ pics_historico         │
        └─────────┬──────────────┘
                  ▼
        ┌────────────────────────┐
        │ pics_audio_offer       │ ──► gravarPics()
        └─────────┬──────────────┘
                  ▼
        ┌────────────────────────┐
        │ follow_up_optin        │ ──► agendarFollowUp()
        └─────────┬──────────────┘
                  ▼
        ┌────────────────────────┐
        │ conteudo               │ (terminal — render adaptativo)
        └────────────────────────┘
```

---

## Persistência por bloco

| Bloco | Action chamada | Ponto de persistência |
|---|---|---|
| LGPD | `aceitarTcle()` | Cria participante + grava consentimento |
| Red flags | `gravarRedFlags()` | Grava 1 linha em `triagens_red_flags` |
| Demografia (4 perguntas) | `gravarDemografia()` | UPDATE no participante (chamada após escolaridade) |
| Clínico (5 perguntas) | `gravarClinico()` | INSERT em `respostas_clinicas` + `eva_medicoes(baseline)` |
| PICS (2 perguntas) | `gravarPics()` | INSERT em `pics_uso` |
| Follow-up | `agendarFollowUp()` | UPDATE participante (email_hash) + INSERT `follow_ups` |

> Repare que demografia tem 4 perguntas mas só **uma** action — o estado se acumula no client e é gravado ao final do bloco. **Trade-off:** se o usuário fechar a aba entre "Idade" e "Escolaridade", perde-se as 3 primeiras respostas. Se isso virar problema, a solução é gravar pergunta-a-pergunta (custo: mais writes no banco).

---

## Como adicionar uma nova pergunta

Exemplo: adicionar **"Frequência semanal de exercício"** depois de PICS.

### Passo 1 — adicionar ao state machine

Em [lib/chatbot/flow.ts](../web/src/lib/chatbot/flow.ts):

```ts
export type ChatStep =
  | "lgpd"
  // ...
  | "pics_audio_offer"
  | "exercicio_frequencia"      // ← novo step
  | "follow_up_optin"
  // ...

export interface ChatState {
  // ...
  exercicio: { frequencia_semanal?: number };  // ← acumulador
  // ...
}

export const initialState: ChatState = {
  // ...
  exercicio: {},  // ← inicial
};
```

### Passo 2 — gravar no banco

Adicionar tabela `exercicio_atividade` no schema SQL (migration `0003_*.sql`) e o tipo correspondente em `lib/db/types.ts`. Adicionar método `recordExercicio` ao `Repository` e à `JsonFileRepository`.

### Passo 3 — criar a server action

Em [app/avaliacao/actions.ts](../web/src/app/avaliacao/actions.ts):

```ts
export interface ExercicioInput {
  frequencia_semanal: number;
}

export async function gravarExercicio(input: ExercicioInput): Promise<void> {
  const participanteId = await getOrCreateParticipantId();
  const repo = await getRepository();
  await repo.recordExercicio({
    participante_id: participanteId,
    registrado_em: new Date().toISOString(),
    frequencia_semanal: input.frequencia_semanal,
  });
}
```

### Passo 4 — wire up no chatbot

Em [chatbot.tsx](../web/src/app/avaliacao/_components/chatbot.tsx):

1. Adicionar handler `handleExercicio` que chama `gravarExercicio` e avança para `follow_up_optin`.
2. Adicionar bloco `{state.step === "exercicio_frequencia" && (...)}` no render.
3. Mudar o final de `handleAudio` para avançar para `exercicio_frequencia` em vez de `follow_up_optin`.

### Passo 5 — testar

Rodar T1 do [checklist de testes](00-checklist-de-testes.md) e verificar que o JSON tem a nova entrada.

---

## Como mudar o texto de uma pergunta

As perguntas estão **inline** no [chatbot.tsx](../web/src/app/avaliacao/_components/chatbot.tsx) — procure a string e edite. Em uma fase futura, faria sentido extrair para um arquivo de strings (i18n-ready). Não é prioridade para o MVP.

## Como mudar a inferência da hipótese CID

Em [lib/chatbot/flow.ts](../web/src/lib/chatbot/flow.ts):

```ts
export function inferirHipoteseCid(localizacao?: string): string {
  if (localizacao === "lombar_pernas") return "M54.4";  // lombociatalgia
  return "M54.5";                                        // lombalgia
}
```

Manter a lista de códigos CID-10 sincronizada com o que a coordenação científica especificar.
