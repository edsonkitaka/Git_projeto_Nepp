// Tipos TypeScript espelhando o schema Postgres em db/migrations/0001.
// Mantém o vocabulário dos enums idêntico ao SQL para que a migração futura
// pra Supabase seja apenas troca de driver, sem renomear campos.

export type Escolaridade =
  | "sem_instrucao"
  | "fundamental_incompleto"
  | "fundamental_completo"
  | "medio_incompleto"
  | "medio_completo"
  | "superior_incompleto"
  | "superior_completo"
  | "pos_graduacao";

export type RacaCor =
  | "branca"
  | "preta"
  | "parda"
  | "amarela"
  | "indigena"
  | "nao_declarada";

export type SexoBiologico = "feminino" | "masculino" | "intersexo" | "nao_informado";

export type MomentoEva = "baseline" | "follow_up_7d";

export type UsoPics = "nunca_usou" | "ja_usou_passado" | "usa_atualmente";

export type StatusFollowup =
  | "agendado"
  | "enviado"
  | "respondido"
  | "expirado"
  | "cancelado";

// Agrupamento analítico (espelha a view v_eva_delta)
export type EscolaridadeGrupo = "baixa" | "alta";

export const escolaridadeGrupo = (e: Escolaridade | null): EscolaridadeGrupo | null => {
  if (e === null) return null;
  const baixa: Escolaridade[] = [
    "sem_instrucao",
    "fundamental_incompleto",
    "fundamental_completo",
    "medio_incompleto",
    "medio_completo",
  ];
  return baixa.includes(e) ? "baixa" : "alta";
};

// ---------- Entidades ----------

export interface Participante {
  id: string;
  criado_em: string; // ISO
  idade: number | null;
  sexo: SexoBiologico | null;
  raca: RacaCor | null;
  etnia_livre: string | null;
  escolaridade: Escolaridade | null;
  email_hash: string | null; // hex sha256
  email_dominio: string | null;
  follow_up_token: string;
  soft_deleted_em: string | null;
}

export interface ConsentimentoLgpd {
  id: string;
  participante_id: string;
  versao_tcle: string;
  aceito_em: string;
  ip_hash: string | null;
  user_agent: string | null;
  revogado_em: string | null;
}

export interface TriagemRedFlags {
  id: string;
  participante_id: string;
  registrada_em: string;
  trauma_recente: boolean;
  perda_peso_inexplicada: boolean;
  febre_persistente: boolean;
  incontinencia_urinaria: boolean;
  dor_noturna_intensa: boolean;
  fraqueza_progressiva: boolean;
  historico_cancer: boolean;
  encerrado_por_red_flag: boolean; // derivado
}

export interface RespostaClinica {
  id: string;
  participante_id: string;
  registrada_em: string;
  localizacao_dor: string | null;
  gatilho: string | null;
  comorbidades_cid10: string[];
  estado_emocional: string[];
  hipotese_cid10: string | null;
  notas: string | null;
}

export interface EvaMedicao {
  id: string;
  participante_id: string;
  momento: MomentoEva;
  valor: number; // 0-10
  registrada_em: string;
}

export interface PicsUso {
  id: string;
  participante_id: string;
  registrado_em: string;
  historico: UsoPics;
  praticas: string[];
  acessou_audio: boolean;
}

export interface FollowUp {
  id: string;
  participante_id: string;
  agendado_para: string; // ISO — D0 + 7d
  enviado_em: string | null;
  respondido_em: string | null;
  status: StatusFollowup;
  canal: "email" | "link_copiado";
  tentativas_envio: number;
}

// Snapshot completo (para a impl JSON)
export interface DatabaseSnapshot {
  participantes: Participante[];
  consentimentos_lgpd: ConsentimentoLgpd[];
  triagens_red_flags: TriagemRedFlags[];
  respostas_clinicas: RespostaClinica[];
  eva_medicoes: EvaMedicao[];
  pics_uso: PicsUso[];
  follow_ups: FollowUp[];
}

export const emptySnapshot = (): DatabaseSnapshot => ({
  participantes: [],
  consentimentos_lgpd: [],
  triagens_red_flags: [],
  respostas_clinicas: [],
  eva_medicoes: [],
  pics_uso: [],
  follow_ups: [],
});
