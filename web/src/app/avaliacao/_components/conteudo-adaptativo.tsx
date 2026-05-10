"use client";

import { obterConteudoAdaptativo } from "@/lib/chatbot/content";
import { escolaridadeGrupo, type Escolaridade } from "@/lib/db/types";
import { useState } from "react";

type Props = {
  escolaridade: Escolaridade | null;
  followUp: { token: string; canal: string } | null;
};

export function ConteudoAdaptativo({ escolaridade, followUp }: Props) {
  const grupo = escolaridadeGrupo(escolaridade);
  const c = obterConteudoAdaptativo(grupo);
  const [copied, setCopied] = useState(false);

  const followUpUrl =
    typeof window !== "undefined" && followUp
      ? `${window.location.origin}/followup/${followUp.token}`
      : "";

  return (
    <article className="space-y-5 border-l-[6px] border-[var(--color-unicamp-red)] bg-white p-5">
      <header>
        <p className="m-0 text-sm font-bold uppercase tracking-wider text-[var(--color-unicamp-red)]">
          {grupo === "alta" ? "Plano técnico" : "Plano para você"}
        </p>
        <h2 className="m-0 mt-1 text-xl font-bold text-[var(--color-nepp-blue)]">
          {c.titulo}
        </h2>
      </header>

      <p className="text-base font-medium italic text-black">{c.intro}</p>

      <div className="space-y-3 text-base">
        {c.corpo.map((p, i) => (
          <p key={i} className="m-0">
            {p}
          </p>
        ))}
      </div>

      {c.video && (
        <section className="border-2 border-black bg-black p-6 text-center text-white">
          <p className="m-0 text-sm uppercase tracking-wider opacity-70">
            🎬 Vídeo
          </p>
          <p className="mt-2 font-bold">{c.video.rotulo}</p>
          <p className="mt-1 text-sm opacity-80">{c.video.roteiro}</p>
          <p className="mt-3 text-xs opacity-50">[gravação a ser produzida pela equipe]</p>
        </section>
      )}

      <section className="border-2 border-[var(--color-nepp-blue)] bg-[var(--color-mute)] p-5">
        <p className="m-0 text-sm uppercase tracking-wider text-[var(--color-nepp-blue)]">
          🎧 Áudio guiado (PICS)
        </p>
        <p className="mt-1 font-bold">{c.audio.rotulo}</p>
        <p className="mt-1 text-sm">{c.audio.descricao}</p>
        <p className="mt-3 text-xs opacity-60">[gravação a ser produzida pela equipe]</p>
      </section>

      {followUp && (
        <section className="border-2 border-black bg-[var(--color-accent-gold)] p-5 text-black">
          <p className="m-0 font-bold">📅 Reavaliação em 7 dias</p>
          {followUp.canal === "email" ? (
            <p className="mt-2">
              Te lembraremos por e-mail. O lembrete chegará em 7 dias com o link
              de reavaliação.
            </p>
          ) : (
            <>
              <p className="mt-2">
                <strong>Salve este link</strong> para reavaliar a sua dor daqui a
                7 dias:
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <input
                  readOnly
                  value={followUpUrl}
                  className="h-10 flex-1 min-w-[220px] rounded-md border-2 border-black bg-white px-3 text-sm"
                />
                <button
                  type="button"
                  onClick={async () => {
                    await navigator.clipboard.writeText(followUpUrl);
                    setCopied(true);
                  }}
                  className="h-10 cursor-pointer rounded-md border-2 border-black bg-black px-4 font-bold text-[var(--color-accent-gold)]"
                >
                  {copied ? "Copiado!" : "Copiar"}
                </button>
              </div>
            </>
          )}
        </section>
      )}
    </article>
  );
}
