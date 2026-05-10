// Conteúdo adaptativo por escolaridade.
// Texto canônico vem do .docx "neurociência da dor - texto de referencia para pacientes AE".
//
// Regra: escolaridade ∈ {sem_instrucao, fundamental_*, medio_*} → trilha BAIXA
//        escolaridade ∈ {superior_*, pos_graduacao}            → trilha ALTA
//
// O grupo é calculado em escolaridadeGrupo() (lib/db/types.ts).

import type { EscolaridadeGrupo } from "@/lib/db/types";

interface Recomendacao {
  titulo: string;
  intro: string;
  corpo: string[];
  audio: { rotulo: string; descricao: string };
  video?: { rotulo: string; roteiro: string };
}

const trilhaBaixaEscolaridade: Recomendacao = {
  titulo: "O movimento é o seu melhor remédio",
  intro:
    "Você já sentiu que sua dor nas costas parece um alarme que não desliga nunca? Mesmo quando você está descansando?",
  corpo: [
    "Imagine que o seu corpo tem um alarme de carro. Na dor crônica, esse alarme fica sensível demais. Às vezes, só de uma folha cair perto do carro, ele já começa a gritar. Não é que o carro está sendo roubado — é só o alarme que está regulado errado.",
    "O nosso objetivo aqui não é te dar remédio para apagar o alarme, mas sim te ensinar movimentos simples que mostram para o seu cérebro que o seu corpo é forte e está seguro. O movimento ajuda a baixar o volume desse alarme.",
    "Vamos começar com um movimento simples hoje?",
  ],
  audio: {
    rotulo: "Áudio guiado: Relaxamento da Lombar (5 min)",
    descricao:
      "Um exercício de respiração e relaxamento para você fazer em qualquer lugar.",
  },
  video: {
    rotulo: "Vídeo: Alongamento Gato-Camelo (1 min)",
    roteiro:
      "Movimento suave de mobilidade para a coluna lombar, recomendado pela equipe de fisioterapia.",
  },
};

const trilhaAltaEscolaridade: Recomendacao = {
  titulo: "A neurofisiologia da cronicidade: entendendo a sensibilização central",
  intro:
    "A dor lombar persistente (CID M54.5) frequentemente evolui de uma resposta nociceptiva aguda para um estado de sensibilização central.",
  corpo: [
    "Diferente da dor aguda, que sinaliza um dano tecidual imediato, a dor crônica reflete uma alteração na modulação do sistema nervoso central. O limiar de excitabilidade dos neurônios medulares é reduzido, fazendo com que estímulos antes inócuos sejam interpretados como dolorosos.",
    "Fatores como estresse, privação de sono e hipervigilância atuam como moduladores top-down, amplificando a experiência dolorosa.",
    "O tratamento não-invasivo foca em neuroplasticidade positiva: exposição gradual ao movimento e educação em dor para recalibrar o sistema de alarme. A literatura sugere que a respiração diafragmática reduz o tônus muscular protetor; o repouso prolongado, por outro lado, agrava a rigidez articular.",
  ],
  audio: {
    rotulo: "Protocolo de Meditação Ativa — PICS (10 min)",
    descricao:
      "Sequência guiada baseada em mindfulness para modulação descendente da dor.",
  },
};

export function obterConteudoAdaptativo(
  grupo: EscolaridadeGrupo | null,
): Recomendacao {
  return grupo === "alta" ? trilhaAltaEscolaridade : trilhaBaixaEscolaridade;
}
