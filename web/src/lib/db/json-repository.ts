// Implementação file-based do Repository.
// Persiste em web/.data/db.json. Trocar por SupabaseRepository numa fase futura.
//
// Limitações conhecidas (aceitáveis pra MVP local):
//  - sem locking real (single-process node dev)
//  - read/write integral do arquivo a cada operação (volume baixo)
//  - sem migrations — schema é o tipo TS

import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

import type { Repository, NewParticipante, ParticipanteUpdate } from "./repository";
import {
  type ConsentimentoLgpd,
  type DatabaseSnapshot,
  type EvaMedicao,
  type FollowUp,
  type Participante,
  type PicsUso,
  type RespostaClinica,
  type TriagemRedFlags,
  emptySnapshot,
} from "./types";

const DATA_DIR = path.join(process.cwd(), ".data");
const DB_FILE = path.join(DATA_DIR, "db.json");

export class JsonFileRepository implements Repository {
  private async load(): Promise<DatabaseSnapshot> {
    try {
      const raw = await fs.readFile(DB_FILE, "utf8");
      return JSON.parse(raw) as DatabaseSnapshot;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return emptySnapshot();
      throw err;
    }
  }

  private async save(snap: DatabaseSnapshot): Promise<void> {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(DB_FILE, JSON.stringify(snap, null, 2), "utf8");
  }

  // ---------- participantes ----------

  async createParticipante(data: NewParticipante): Promise<Participante> {
    const snap = await this.load();
    const p: Participante = {
      ...data,
      id: randomUUID(),
      criado_em: new Date().toISOString(),
      follow_up_token: randomUUID(),
    };
    snap.participantes.push(p);
    await this.save(snap);
    return p;
  }

  async updateParticipante(id: string, patch: ParticipanteUpdate): Promise<Participante> {
    const snap = await this.load();
    const idx = snap.participantes.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error(`Participante ${id} não encontrado`);
    snap.participantes[idx] = { ...snap.participantes[idx], ...patch };
    await this.save(snap);
    return snap.participantes[idx];
  }

  async findParticipanteById(id: string): Promise<Participante | null> {
    const snap = await this.load();
    return snap.participantes.find((p) => p.id === id) ?? null;
  }

  async findParticipanteByFollowupToken(token: string): Promise<Participante | null> {
    const snap = await this.load();
    return snap.participantes.find((p) => p.follow_up_token === token) ?? null;
  }

  // ---------- entidades 1-N ----------

  async recordConsentimento(
    c: Omit<ConsentimentoLgpd, "id">,
  ): Promise<ConsentimentoLgpd> {
    const snap = await this.load();
    const row: ConsentimentoLgpd = { id: randomUUID(), ...c };
    snap.consentimentos_lgpd.push(row);
    await this.save(snap);
    return row;
  }

  async recordRedFlags(
    t: Omit<TriagemRedFlags, "id" | "encerrado_por_red_flag">,
  ): Promise<TriagemRedFlags> {
    const snap = await this.load();
    const encerrado =
      t.trauma_recente ||
      t.perda_peso_inexplicada ||
      t.febre_persistente ||
      t.incontinencia_urinaria ||
      t.dor_noturna_intensa ||
      t.fraqueza_progressiva ||
      t.historico_cancer;
    const row: TriagemRedFlags = {
      id: randomUUID(),
      ...t,
      encerrado_por_red_flag: encerrado,
    };
    snap.triagens_red_flags.push(row);
    await this.save(snap);
    return row;
  }

  async recordRespostaClinica(r: Omit<RespostaClinica, "id">): Promise<RespostaClinica> {
    const snap = await this.load();
    const row: RespostaClinica = { id: randomUUID(), ...r };
    snap.respostas_clinicas.push(row);
    await this.save(snap);
    return row;
  }

  async recordEva(e: Omit<EvaMedicao, "id">): Promise<EvaMedicao> {
    const snap = await this.load();
    // Constraint UNIQUE (participante, momento) — replica do SQL
    const dup = snap.eva_medicoes.find(
      (m) => m.participante_id === e.participante_id && m.momento === e.momento,
    );
    if (dup) {
      throw new Error(
        `EVA já registrada para participante ${e.participante_id} no momento ${e.momento}`,
      );
    }
    const row: EvaMedicao = { id: randomUUID(), ...e };
    snap.eva_medicoes.push(row);
    await this.save(snap);
    return row;
  }

  async recordPics(p: Omit<PicsUso, "id">): Promise<PicsUso> {
    const snap = await this.load();
    const row: PicsUso = { id: randomUUID(), ...p };
    snap.pics_uso.push(row);
    await this.save(snap);
    return row;
  }

  // ---------- follow-ups ----------

  async scheduleFollowUp(f: Omit<FollowUp, "id">): Promise<FollowUp> {
    const snap = await this.load();
    const row: FollowUp = { id: randomUUID(), ...f };
    snap.follow_ups.push(row);
    await this.save(snap);
    return row;
  }

  async findFollowUpByParticipante(participanteId: string): Promise<FollowUp | null> {
    const snap = await this.load();
    return snap.follow_ups.find((f) => f.participante_id === participanteId) ?? null;
  }

  async listPendingFollowUps(now: Date = new Date()): Promise<FollowUp[]> {
    const snap = await this.load();
    return snap.follow_ups.filter(
      (f) => f.status === "agendado" && new Date(f.agendado_para) <= now,
    );
  }

  async markFollowUpResponded(participanteId: string): Promise<void> {
    const snap = await this.load();
    const fu = snap.follow_ups.find((f) => f.participante_id === participanteId);
    if (!fu) return;
    fu.status = "respondido";
    fu.respondido_em = new Date().toISOString();
    await this.save(snap);
  }

  async findEvaByMomento(
    participanteId: string,
    momento: import("./types").MomentoEva,
  ): Promise<import("./types").EvaMedicao | null> {
    const snap = await this.load();
    return (
      snap.eva_medicoes.find(
        (m) => m.participante_id === participanteId && m.momento === momento,
      ) ?? null
    );
  }
}
