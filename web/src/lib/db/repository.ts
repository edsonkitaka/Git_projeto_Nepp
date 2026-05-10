// Interface única que o resto da aplicação consome.
// Trocar de JSON para Supabase = mudar a `getRepository()` factory.

import type {
  ConsentimentoLgpd,
  EvaMedicao,
  FollowUp,
  Participante,
  PicsUso,
  RespostaClinica,
  TriagemRedFlags,
} from "./types";

export type NewParticipante = Omit<Participante, "id" | "criado_em" | "follow_up_token">;
export type ParticipanteUpdate = Partial<Omit<Participante, "id" | "criado_em">>;

export interface Repository {
  createParticipante(data: NewParticipante): Promise<Participante>;
  updateParticipante(id: string, patch: ParticipanteUpdate): Promise<Participante>;
  findParticipanteById(id: string): Promise<Participante | null>;
  findParticipanteByFollowupToken(token: string): Promise<Participante | null>;

  recordConsentimento(c: Omit<ConsentimentoLgpd, "id">): Promise<ConsentimentoLgpd>;
  recordRedFlags(
    t: Omit<TriagemRedFlags, "id" | "encerrado_por_red_flag">,
  ): Promise<TriagemRedFlags>;
  recordRespostaClinica(r: Omit<RespostaClinica, "id">): Promise<RespostaClinica>;
  recordEva(e: Omit<EvaMedicao, "id">): Promise<EvaMedicao>;
  recordPics(p: Omit<PicsUso, "id">): Promise<PicsUso>;

  scheduleFollowUp(f: Omit<FollowUp, "id">): Promise<FollowUp>;
  findFollowUpByParticipante(participanteId: string): Promise<FollowUp | null>;
  markFollowUpResponded(participanteId: string): Promise<void>;

  // Para a Fase 6 — listar follow-ups vencidos
  listPendingFollowUps(now?: Date): Promise<FollowUp[]>;

  // Helpers analíticos
  findEvaByMomento(
    participanteId: string,
    momento: import("./types").MomentoEva,
  ): Promise<import("./types").EvaMedicao | null>;
}

// ----- Factory -------------------------------------------------------

let cached: Repository | null = null;

export async function getRepository(): Promise<Repository> {
  if (cached) return cached;

  // No futuro: ler env var DB_DRIVER e instanciar o adapter Supabase.
  // Hoje: JSON local.
  const { JsonFileRepository } = await import("./json-repository");
  cached = new JsonFileRepository();
  return cached;
}
