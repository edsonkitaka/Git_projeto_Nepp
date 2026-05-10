"use server";

import { getRepository } from "@/lib/db/repository";

export async function gravarEvaFollowUp(
  token: string,
  valor: number,
): Promise<{ ok: true; delta: number } | { ok: false; reason: string }> {
  if (valor < 0 || valor > 10) return { ok: false, reason: "Valor fora da escala 0-10" };

  const repo = await getRepository();
  const p = await repo.findParticipanteByFollowupToken(token);
  if (!p) return { ok: false, reason: "Token inválido ou expirado" };

  try {
    await repo.recordEva({
      participante_id: p.id,
      momento: "follow_up_7d",
      valor,
      registrada_em: new Date().toISOString(),
    });
  } catch (err) {
    return {
      ok: false,
      reason: (err as Error).message ?? "Não foi possível registrar a reavaliação",
    };
  }

  await repo.markFollowUpResponded(p.id);

  const baseline = await repo.findEvaByMomento(p.id, "baseline");
  const delta = baseline ? valor - baseline.valor : 0;

  return { ok: true, delta };
}
