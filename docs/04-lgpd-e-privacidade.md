# LGPD e privacidade

Documento para **coordenação científica** e jurídico institucional. Detalha como a aplicação trata dados pessoais, em que pontos há PII, como é o opt-in, e qual é o caminho para eventuais pedidos de remoção.

---

## Princípio geral

> **A aplicação é desenhada para coletar dados de pesquisa anonimizados.** Por padrão, **não há nome, CPF, telefone ou endereço.** O único dado pessoal que o usuário **pode** fornecer é o **e-mail**, e mesmo este é armazenado apenas como hash sha256 + domínio.

Bases legais aplicáveis (LGPD Art. 7º e Art. 11):
- **Consentimento** (Art. 7º, I) — coletado via TCLE versionado.
- **Pesquisa** (Art. 7º, IV / Art. 11, II "c") — instituição reconhecida realizando pesquisa pública.

---

## O que coletamos

| Dado | Sensível? | Armazenamento | Justificativa |
|---|---|---|---|
| Faixa etária (idade em anos) | Não | Em claro | Estratificação demográfica |
| Sexo biológico | Sensível (saúde) | Em claro | Variável epidemiológica |
| Raça/cor (autodeclarada IBGE) | Sensível | Em claro | Análise de equidade racial |
| Etnia livre (opcional) | Sensível | Em claro | Inclusão de populações específicas (quilombola, ribeirinha) |
| Escolaridade (PNAD) | Não | Em claro | Variável-chave do estudo (linguagem adaptativa) |
| Localização da dor | Sensível (saúde) | Em claro | Inferência CID |
| Comorbidades (CID-10) | Sensível (saúde) | Em claro | Cohort clínica |
| EVA D0 e D7 | Sensível (saúde) | Em claro | Desfecho primário |
| Estado emocional | Sensível (saúde) | Em claro | Modulador biopsicossocial |
| Uso de PICS | Não | Em claro | Cohort PICS |
| **E-mail** | **PII** | **sha256 + salt; só domínio em claro** | Disparo do follow-up D+7 (opt-in) |
| **IP** | **PII** | **sha256 + salt** | Auditoria de consentimento |
| User-Agent | Quasi-PII | Em claro | Análise técnica de compatibilidade |
| Cookie `lombar_participant_id` | Pseudônimo | UUID, httpOnly | Sessão da pesquisa |

---

## Hash sha256 do e-mail — como funciona

1. O usuário digita `joao@gmail.com` no campo opcional do follow-up.
2. O servidor normaliza: `trim().toLowerCase()` → `"joao@gmail.com"`.
3. O servidor extrai o domínio: `"gmail.com"`.
4. O servidor calcula: `sha256(SALT + "joao@gmail.com")` → `"a3f1c0..."` (64 chars hex).
5. **Apenas o hash e o domínio são gravados.** O e-mail original some.

### Implicações práticas

✅ **Análise de cohort por domínio** — possível ("X% dos participantes usam Gmail").

✅ **De-duplicação** — se o mesmo e-mail for usado duas vezes, hashes batem (com o mesmo salt).

✅ **Disparo do follow-up** — o servidor pode comparar `sha256(email_recebido_no_form)` com hashes existentes.

❌ **Reverter o hash** — impossível sem força bruta + acesso ao salt.

❌ **Trocar o salt depois** — quebraria todos os hashes anteriores. **NUNCA** rotacionar o salt em produção após coleta de dados.

### Onde está o código

[web/src/lib/crypto.ts](../web/src/lib/crypto.ts):

```ts
const SALT = process.env.NEPP_HASH_SALT ?? "nepp-mvp-local-dev-salt";

export function sha256Hex(input: string): string {
  return createHash("sha256").update(SALT + input).digest("hex");
}
```

> ⚠ **Antes do primeiro deploy real, definir `NEPP_HASH_SALT` como uma var de ambiente segura, gerada por `openssl rand -hex 32`. NÃO commitar.** O fallback do código é só para dev local.

---

## TCLE (Termo de Consentimento Livre e Esclarecido)

A versão atual referenciada no código é `"v1.0-2026-05"` (em [actions.ts](../web/src/app/avaliacao/actions.ts)).

Cada aceite gera uma linha em `consentimentos_lgpd` com:
- versão do TCLE
- timestamp
- hash do IP do aceite
- user-agent

### Atualizar o TCLE

1. Atualizar o **texto** do TCLE no arquivo institucional canônico (Word/PDF da equipe).
2. Em [actions.ts](../web/src/app/avaliacao/actions.ts), incrementar `TCLE_VERSION` (ex.: `"v1.1-2026-09"`).
3. Atualizar a apresentação do TCLE no [chatbot.tsx](../web/src/app/avaliacao/_components/chatbot.tsx) (mensagem inicial do bot).
4. Deploy. A próxima coleta gravará a nova versão. Linhas anteriores ficam imutáveis (auditoria).

---

## Direitos do titular dos dados (LGPD Art. 18)

| Direito | Como atender |
|---|---|
| Confirmação de tratamento | Endpoint de consulta por hash de e-mail (a implementar — não está no MVP) |
| Acesso | Idem |
| Correção de dados | Idem (limitado pelos campos coletados) |
| Anonimização / bloqueio | Coluna `soft_deleted_em` em `participantes` — preencher para "remover" |
| Eliminação | DELETE em cascata (definido no schema) — **destrutivo, exige justificativa** |
| Portabilidade | Exportar JSON via [manual operacional](05-manual-operacional.md) |
| Revogação do consentimento | Coluna `revogado_em` em `consentimentos_lgpd` |

> A interface administrativa para o titular exercer esses direitos **ainda não foi implementada**. Para o MVP atual, pedidos chegam por canal humano à equipe e o operador executa via SQL ou edição direta do JSON.

---

## Retenção e descarte

| Dado | Retenção sugerida |
|---|---|
| Dados de pesquisa anonimizados | Indefinida (pesquisa científica) |
| `email_hash` | Apenas enquanto follow-up D+7 estiver ativo (≤ 14 dias). Depois, NULL. |
| `ip_hash` | 5 anos (auditoria de consentimento) |
| Logs de aplicação | 90 dias |

A política de retenção exige **um job de limpeza** que ainda não foi implementado. Será adicionado quando migrarmos para Supabase (pg_cron).

---

## Pontos de atenção para o jurídico

1. **Soft-delete via `soft_deleted_em`** vs delete físico — a view `v_eva_delta` já filtra `WHERE soft_deleted_em IS NULL`, então o participante "soft-deletado" some das análises. Mas a linha continua no banco. Confirmar se isto atende ao Art. 16.
2. **Hash de IP não é anonimização perfeita** — com salt comprometido, é possível enumerar IPs (universo finito). Documentar isto na DPIA.
3. **TCLE deve ser explícito sobre o follow-up D+7** — quem aceita o TCLE inicial está aceitando o lembrete por e-mail. Garantir que o texto do TCLE menciona isso.
4. **Dados sensíveis de saúde (Art. 11)** — a base legal é "pesquisa por órgão de pesquisa" (Art. 11 II "c"). Manter a Resolução do CONEP correspondente arquivada.
5. **Comitê de Ética em Pesquisa (CEP)** — não substitui a aprovação ética. O sistema é uma ferramenta; o protocolo de pesquisa é separado.

---

## Em caso de incidente de segurança (Art. 48)

1. Identificar o escopo (quais hashes/dados foram acessados).
2. Comunicar à ANPD em prazo razoável.
3. Comunicar aos titulares afetados (se possível identificá-los — para hashes de e-mail isto é limitado).
4. Documentar e revisar o salt: **rotação do salt invalida hashes anteriores**, então a decisão é se vale o reset (perda da capacidade de reconciliar follow-ups antigos).

Manter um runbook de resposta a incidentes alinhado com o setor de TI da Unicamp.
