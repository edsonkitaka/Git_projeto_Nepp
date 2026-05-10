"use client";

import { useState, useTransition } from "react";
import { gravarEvaFollowUp } from "./actions";

export function FollowUpForm({ token }: { token: string }) {
  const [valor, setValor] = useState<number | null>(null);
  const [resultado, setResultado] = useState<
    { ok: true; delta: number } | { ok: false; reason: string } | null
  >(null);
  const [pending, startTransition] = useTransition();

  if (resultado?.ok) {
    return (
      <section className="mt-8 border-2 border-[var(--color-nepp-blue)] bg-[var(--color-mute)] p-6">
        <h2 className="m-0 text-xl font-bold text-[var(--color-nepp-blue)]">
          Obrigado por participar!
        </h2>
        <p className="mt-3">
          Sua reavaliação foi registrada.{" "}
          {resultado.delta < 0 ? (
            <strong>Houve melhora de {Math.abs(resultado.delta)} ponto(s) na escala.</strong>
          ) : resultado.delta > 0 ? (
            <strong>A dor aumentou em {resultado.delta} ponto(s) — considere conversar com um profissional.</strong>
          ) : (
            <strong>A intensidade ficou estável.</strong>
          )}
        </p>
        <p className="mt-3 text-sm opacity-80">
          Esses dados anônimos integram o Observatório de Saúde do NEPP/UNICAMP.
        </p>
      </section>
    );
  }

  return (
    <div className="mt-4 space-y-4">
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 11 }, (_, i) => i).map((n) => (
          <button
            key={n}
            type="button"
            aria-pressed={valor === n}
            onClick={() => setValor(n)}
            className={
              "h-12 min-w-[48px] cursor-pointer rounded-md border-2 border-black px-3 text-base font-bold " +
              (valor === n
                ? "bg-[var(--color-unicamp-red)] text-white"
                : "bg-white text-black hover:bg-[var(--color-nepp-blue)] hover:text-white")
            }
          >
            {n}
          </button>
        ))}
      </div>

      <button
        type="button"
        disabled={valor === null || pending}
        onClick={() =>
          startTransition(async () => {
            const r = await gravarEvaFollowUp(token, valor!);
            setResultado(r);
          })
        }
        className="h-12 cursor-pointer rounded-md border-2 border-black bg-black px-6 font-extrabold text-[var(--color-accent-gold)] disabled:opacity-50"
      >
        {pending ? "Enviando…" : "Registrar reavaliação"}
      </button>

      {resultado && !resultado.ok && (
        <p className="text-[var(--color-unicamp-red)]">{resultado.reason}</p>
      )}
    </div>
  );
}
