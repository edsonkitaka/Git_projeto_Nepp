"use server";

// Server Actions do fluxo de avaliação.
// Cada bloco do bot grava seu pedaço atomicamente — se o usuário abandonar,
// o que já foi coletado fica registrado (importante pra análise de dropout).

import { cookies, headers } from "next/headers";
import { getRepository } from "@/lib/db/repository";
import { sha256Hex, normalizeEmail, emailDomain } from "@/lib/crypto";
import type {
  Escolaridade,
  RacaCor,
  SexoBiologico,
  UsoPics,
} from "@/lib/db/types";
import { inferirHipoteseCid } from "@/lib/chatbot/flow";

const TCLE_VERSION = "v1.0-2026-05";
const COOKIE_NAME = "lombar_participant_id";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 dias

// Exigência: participante já existe na sessão atual (criado por aceitarTcle).
// Lança erro se a sessão for inválida — pra blindar contra chamadas fora de ordem.
async function requireParticipantId(): Promise<string> {
  const jar = await cookies();
  const id = jar.get(COOKIE_NAME)?.value;
  if (!id) {
    throw new Error("Sessão não iniciada — aceite o TCLE primeiro");
  }
  const repo = await getRepository();
  const found = await repo.findParticipanteById(id);
  if (!found) {
    throw new Error("Sessão inválida — recarregue a página");
  }
  return id;
}

// Sempre cria um novo participante — o aceite do TCLE é o ponto de entrada do fluxo.
// Se já havia cookie de uma rodada anterior, ele é sobrescrito; o participante antigo
// permanece no banco como histórico (com TCLE + o que tiver gravado).
async function startNewParticipant(): Promise<string> {
  const repo = await getRepository();
  const p = await repo.createParticipante({
    idade: null,
    sexo: null,
    raca: null,
    etnia_livre: null,
    escolaridade: null,
    email_hash: null,
    email_dominio: null,
    soft_deleted_em: null,
  });
  const jar = await cookies();
  jar.set(COOKIE_NAME, p.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
  return p.id;
}

// ---------- LGPD ----------

export async function aceitarTcle(): Promise<{ participanteId: string }> {
  const participanteId = await startNewParticipant();
  const repo = await getRepository();
  const hdrs = await headers();
  const ua = hdrs.get("user-agent") ?? null;
  const ip = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

  await repo.recordConsentimento({
    participante_id: participanteId,
    versao_tcle: TCLE_VERSION,
    aceito_em: new Date().toISOString(),
    ip_hash: ip ? sha256Hex(ip) : null,
    user_agent: ua,
    revogado_em: null,
  });

  return { participanteId };
}

// ---------- Red flags ----------

export interface RedFlagsInput {
  trauma_recente: boolean;
  perda_peso_inexplicada: boolean;
  febre_persistente: boolean;
  incontinencia_urinaria: boolean;
  dor_noturna_intensa: boolean;
  fraqueza_progressiva: boolean;
  historico_cancer: boolean;
}

export async function gravarRedFlags(
  input: RedFlagsInput,
): Promise<{ encerrado: boolean }> {
  const participanteId = await requireParticipantId();
  const repo = await getRepository();
  const row = await repo.recordRedFlags({
    participante_id: participanteId,
    registrada_em: new Date().toISOString(),
    ...input,
  });
  return { encerrado: row.encerrado_por_red_flag };
}

// ---------- Demografia ----------

export interface DemografiaInput {
  idade: number;
  sexo: SexoBiologico;
  raca: RacaCor;
  escolaridade: Escolaridade;
}

export async function gravarDemografia(input: DemografiaInput): Promise<void> {
  const participanteId = await requireParticipantId();
  const repo = await getRepository();
  await repo.updateParticipante(participanteId, {
    idade: input.idade,
    sexo: input.sexo,
    raca: input.raca,
    escolaridade: input.escolaridade,
  });
}

// ---------- Clínico ----------

export interface ClinicoInput {
  localizacao_dor: "lombar_apenas" | "lombar_pernas" | "lombar_quadril";
  gatilho: string;
  comorbidades_cid10: string[];
  estado_emocional: string[];
  eva_d0: number;
}

export async function gravarClinico(
  input: ClinicoInput,
): Promise<{ hipotese_cid10: string }> {
  const participanteId = await requireParticipantId();
  const repo = await getRepository();
  const hipotese = inferirHipoteseCid(input.localizacao_dor);

  await repo.recordRespostaClinica({
    participante_id: participanteId,
    registrada_em: new Date().toISOString(),
    localizacao_dor: input.localizacao_dor,
    gatilho: input.gatilho,
    comorbidades_cid10: input.comorbidades_cid10,
    estado_emocional: input.estado_emocional,
    hipotese_cid10: hipotese,
    notas: null,
  });

  await repo.recordEva({
    participante_id: participanteId,
    momento: "baseline",
    valor: input.eva_d0,
    registrada_em: new Date().toISOString(),
  });

  return { hipotese_cid10: hipotese };
}

// ---------- PICS ----------

export interface PicsInput {
  historico: UsoPics;
  praticas: string[];
  acessou_audio: boolean;
}

export async function gravarPics(input: PicsInput): Promise<void> {
  const participanteId = await requireParticipantId();
  const repo = await getRepository();
  await repo.recordPics({
    participante_id: participanteId,
    registrado_em: new Date().toISOString(),
    historico: input.historico,
    praticas: input.praticas,
    acessou_audio: input.acessou_audio,
  });
}

// ---------- Follow-up D+7 ----------

export interface FollowUpInput {
  email?: string;
}

export async function agendarFollowUp(
  input: FollowUpInput,
): Promise<{ token: string; agendadoPara: string; canal: "email" | "link_copiado" }> {
  const participanteId = await requireParticipantId();
  const repo = await getRepository();

  const seteDias = new Date();
  seteDias.setDate(seteDias.getDate() + 7);
  const agendadoPara = seteDias.toISOString();

  let canal: "email" | "link_copiado" = "link_copiado";
  if (input.email) {
    const norm = normalizeEmail(input.email);
    const dom = emailDomain(norm);
    if (dom) {
      await repo.updateParticipante(participanteId, {
        email_hash: sha256Hex(norm),
        email_dominio: dom,
      });
      canal = "email";
    }
  }

  const fu = await repo.scheduleFollowUp({
    participante_id: participanteId,
    agendado_para: agendadoPara,
    enviado_em: null,
    respondido_em: null,
    status: "agendado",
    canal,
    tentativas_envio: 0,
  });

  const p = await repo.findParticipanteById(participanteId);
  if (!p) throw new Error("Participante sumiu inesperadamente");

  return { token: p.follow_up_token, agendadoPara: fu.agendado_para, canal };
}

// ---------- Helper para client: ler escolaridade gravada ----------

export async function lerEscolaridadeAtual(): Promise<Escolaridade | null> {
  const jar = await cookies();
  const id = jar.get(COOKIE_NAME)?.value;
  if (!id) return null;
  const repo = await getRepository();
  const p = await repo.findParticipanteById(id);
  return p?.escolaridade ?? null;
}
