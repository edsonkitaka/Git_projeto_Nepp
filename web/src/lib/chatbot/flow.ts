// State machine do chatbot unificado.
// Junta os 4 fluxos dos mocks num único caminho coerente:
//   lgpd → red_flags → demografia → clinico → pics → conteudo → done
//
// Se qualquer red flag for positiva → muda para `red_flag_stop` (encerra).

import type {
  Escolaridade,
  RacaCor,
  SexoBiologico,
  UsoPics,
} from "@/lib/db/types";

export type ChatStep =
  | "lgpd"
  | "red_flags"
  | "red_flag_stop"
  | "demografia_idade"
  | "demografia_sexo"
  | "demografia_raca"
  | "demografia_escolaridade"
  | "clinico_localizacao"
  | "clinico_gatilho"
  | "clinico_comorbidades"
  | "clinico_emocional"
  | "clinico_eva_d0"
  | "pics_historico"
  | "pics_audio_offer"
  | "follow_up_optin"
  | "conteudo"
  | "done";

export interface ChatState {
  step: ChatStep;
  participanteId: string | null;

  // Acumuladores temporários (só persistem ao final de cada bloco via server action)
  redFlags: {
    trauma_recente: boolean;
    perda_peso_inexplicada: boolean;
    febre_persistente: boolean;
    incontinencia_urinaria: boolean;
    dor_noturna_intensa: boolean;
    fraqueza_progressiva: boolean;
    historico_cancer: boolean;
  };
  demografia: {
    idade?: number;
    sexo?: SexoBiologico;
    raca?: RacaCor;
    escolaridade?: Escolaridade;
  };
  clinico: {
    localizacao_dor?: "lombar_apenas" | "lombar_pernas" | "lombar_quadril";
    gatilho?: string;
    comorbidades_cid10: string[];
    estado_emocional: string[];
    eva_d0?: number;
  };
  pics: {
    historico?: UsoPics;
    acessou_audio: boolean;
  };
  email_optin: string | null; // e-mail digitado, ainda não persistido
}

export const initialState: ChatState = {
  step: "lgpd",
  participanteId: null,
  redFlags: {
    trauma_recente: false,
    perda_peso_inexplicada: false,
    febre_persistente: false,
    incontinencia_urinaria: false,
    dor_noturna_intensa: false,
    fraqueza_progressiva: false,
    historico_cancer: false,
  },
  demografia: {},
  clinico: { comorbidades_cid10: [], estado_emocional: [] },
  pics: { acessou_audio: false },
  email_optin: null,
};

// Hipótese diagnóstica (NÃO é diagnóstico médico — só rotula a coorte CID).
// Lógica simples baseada nos mocks:
//   - dor irradiando para pernas → M54.4 (lombociatalgia)
//   - dor lombar isolada → M54.5 (lombalgia)
export function inferirHipoteseCid(localizacao?: string): string {
  if (localizacao === "lombar_pernas") return "M54.4";
  return "M54.5";
}
