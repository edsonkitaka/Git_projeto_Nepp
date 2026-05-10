# Curadoria de conteúdo

Guia para **supervisão pedagógica e coordenação científica.** Mostra onde editar os textos vistos pelo participante e como adicionar/atualizar vídeos e áudios.

---

## Princípio editorial

A diferença entre as **trilhas alta e baixa escolaridade** não é só o "nível do texto" — é a **estrutura mental** apresentada:

- **Trilha BAIXA** — metáforas concretas (alarme de carro, volume), instruções imperativas curtas, foco em ação ("Vamos fazer um movimento simples"), reforço positivo ("o seu corpo é forte e está seguro").
- **Trilha ALTA** — vocabulário técnico (sensibilização central, modulação top-down, neuroplasticidade), estrutura de artigo curto, cita evidência implicitamente (NICE, NHS).

Esta diferenciação é a **hipótese central da pesquisa** — alterar o tom muda o estudo. Mudanças de conteúdo significativas devem passar pela coordenação científica.

---

## Onde está o texto

Arquivo: [`web/src/lib/chatbot/content.ts`](../web/src/lib/chatbot/content.ts)

Estrutura:

```ts
const trilhaBaixaEscolaridade: Recomendacao = {
  titulo: "...",
  intro: "...",
  corpo: ["parágrafo 1", "parágrafo 2", ...],
  audio: { rotulo: "...", descricao: "..." },
  video: { rotulo: "...", roteiro: "..." }   // só baixa
};

const trilhaAltaEscolaridade: Recomendacao = {
  titulo: "...",
  intro: "...",
  corpo: ["parágrafo 1", ...],
  audio: { rotulo: "...", descricao: "..." }
};
```

### Como editar

1. Abrir o arquivo no VS Code (ou editor de preferência).
2. Localizar o bloco da trilha que quer mudar.
3. Editar entre as aspas. **Manter as aspas e as vírgulas** — a sintaxe TypeScript é exigente.
4. Salvar.
5. Com `npm run dev` aberto, conferir o resultado em [http://localhost:3000/avaliacao](http://localhost:3000/avaliacao). Pra ver a trilha alta: completar o fluxo escolhendo **Superior**. Pra ver a trilha baixa: escolher **Fundamental**.

### Erros comuns ao editar

| Sintoma | Causa |
|---|---|
| Tela branca após editar | Erro de sintaxe (aspas, vírgula) — abrir o terminal de `npm run dev`, vai aparecer o erro com linha |
| Texto não muda | Cache do browser — `Ctrl+F5` |
| Quebra de linha não funciona | TypeScript: usar `\n` dentro de aspas, ou separar em parágrafos diferentes do array `corpo` |

---

## Mensagens iniciais e perguntas do bot

Strings inline em [`chatbot.tsx`](../web/src/app/avaliacao/_components/chatbot.tsx). Buscar pelo texto e editar.

Exemplos (para localizar):

| Texto exibido | Localização aproximada |
|---|---|
| "Olá! Sou o assistente do Lombar Ativa..." | Início do arquivo, em `useState<Bubble[]>` |
| "Onde exatamente você sente a dor agora?" | `handleEscolaridade`, dentro de `addBot(...)` |
| "De 0 a 10, qual o nível da sua dor lombar agora?..." | `handleEmocionalDone` |
| Mensagem de red flag | `handleRedFlag`, condicional `if (r.encerrado)` |

> **Mudanças de fraseado** (sem mexer no fluxo) são seguras de fazer pela equipe pedagógica. **Mudanças estruturais** (adicionar/remover pergunta, mudar a ordem) devem ser feitas com um dev — ver [03-fluxo-chatbot.md](03-fluxo-chatbot.md).

---

## Adicionar vídeo real (substituir o placeholder)

Hoje, o bloco de vídeo na trilha BAIXA mostra um placeholder preto. Pra plugar um vídeo real:

### Opção 1 — vídeo hospedado externamente (YouTube institucional, Vimeo)

Editar [conteudo-adaptativo.tsx](../web/src/app/avaliacao/_components/conteudo-adaptativo.tsx). Procurar:

```tsx
{c.video && (
  <section className="border-2 border-black bg-black p-6 text-center text-white">
    <p className="m-0 text-sm uppercase tracking-wider opacity-70">🎬 Vídeo</p>
    <p className="mt-2 font-bold">{c.video.rotulo}</p>
    ...
```

Trocar por iframe do YouTube (exemplo):

```tsx
{c.video && (
  <section className="aspect-video w-full">
    <iframe
      src="https://www.youtube-nocookie.com/embed/SEU_VIDEO_ID"
      title={c.video.rotulo}
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
      allowFullScreen
      className="h-full w-full border-2 border-black"
    />
  </section>
)}
```

> Preferir o domínio `youtube-nocookie.com` (privacidade reforçada — não dispara cookies de tracking sem o usuário interagir). Importante para LGPD.

### Opção 2 — vídeo hospedado no Unicamp / S3 institucional

```tsx
<video controls className="w-full border-2 border-black">
  <source src="https://servidor.unicamp.br/lombar/gato-camelo.mp4" type="video/mp4" />
  Seu navegador não suporta vídeo HTML5.
</video>
```

> ⚠ Garantir que o servidor sirva o vídeo com `Content-Type: video/mp4` correto e CORS habilitado.

### Opção 3 — futura: vídeos no Supabase Storage

Quando migrar pra Supabase, usar Storage. Cobrir em [07-migracao-supabase.md](07-migracao-supabase.md).

---

## Adicionar áudio real (substituir o placeholder)

Análogo ao vídeo. O bloco do áudio é o `<section>` com fundo cinza dentro de [conteudo-adaptativo.tsx](../web/src/app/avaliacao/_components/conteudo-adaptativo.tsx). Trocar por:

```tsx
<audio controls className="w-full">
  <source src="/audio/relaxamento-lombar.mp3" type="audio/mpeg" />
  Seu navegador não suporta áudio HTML5.
</audio>
```

E colocar o arquivo `mp3` em `web/public/audio/relaxamento-lombar.mp3`.

---

## Roteiros canônicos (referência da equipe)

Os textos atuais foram extraídos de [`neurociência da dor - texto de referencia para pacientes AE.docx`](../neurocie%CC%82ncia%20da%20dor%20-%20texto%20de%20referencia%20para%20pacientes%20AE.docx) (texto extraído em [_extracted/](../_extracted/)).

| Trilha | Roteiro original |
|---|---|
| ALTA | Artigo "A Neurofisiologia da Cronicidade: Entendendo a Sensibilização Central" |
| BAIXA | Roteiro de vídeo 60s "Alarme de carro" (instrutor sorridente, ambiente iluminado, camiseta NEPP/Unicamp) |

A produção do vídeo BAIXA deve seguir o roteiro completo do .docx. Quando gravado, atualizar o `roteiro` em `content.ts` para a versão final.

---

## Checklist antes de publicar uma atualização de conteúdo

- [ ] Texto revisado pela coordenação pedagógica (Profa. Dra. Ana Lúcia ou Ana Maria)
- [ ] Texto técnico revisado pela coordenação científica (Dra. Evelyn)
- [ ] Vídeo/áudio com legenda (acessibilidade)
- [ ] Vídeo testado em dispositivo móvel (375 px de largura)
- [ ] Áudio: nivelamento de volume, sem clipping
- [ ] Conferir trilha **errada** também — mudou só o que devia? (não vazou texto técnico pra trilha baixa por engano)
- [ ] Salvar versão antiga em backup (caso seja necessário rollback)
- [ ] Comunicar a equipe técnica (Sr. Edson, Sr. Rodrigo) quando for publicar
