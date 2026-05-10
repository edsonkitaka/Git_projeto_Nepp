"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ChatBubble } from "./chat-bubble";
import { SingleChoice, MultiChoice } from "./chat-options";
import { ConteudoAdaptativo } from "./conteudo-adaptativo";
import { initialState, type ChatState } from "@/lib/chatbot/flow";
import {
  aceitarTcle,
  gravarRedFlags,
  gravarDemografia,
  gravarClinico,
  gravarPics,
  agendarFollowUp,
  type RedFlagsInput,
} from "../actions";
import type {
  Escolaridade,
  RacaCor,
  SexoBiologico,
  UsoPics,
} from "@/lib/db/types";

type Bubble = { side: "bot" | "user"; text: string };

const escolaridadeOptions: { label: string; value: Escolaridade }[] = [
  { label: "Sem instrução formal", value: "sem_instrucao" },
  { label: "Fundamental", value: "fundamental_completo" },
  { label: "Médio", value: "medio_completo" },
  { label: "Superior", value: "superior_completo" },
  { label: "Pós-graduação", value: "pos_graduacao" },
];

const racaOptions: { label: string; value: RacaCor }[] = [
  { label: "Branca", value: "branca" },
  { label: "Preta", value: "preta" },
  { label: "Parda", value: "parda" },
  { label: "Amarela", value: "amarela" },
  { label: "Indígena", value: "indigena" },
  { label: "Prefiro não declarar", value: "nao_declarada" },
];

const sexoOptions: { label: string; value: SexoBiologico }[] = [
  { label: "Feminino", value: "feminino" },
  { label: "Masculino", value: "masculino" },
  { label: "Intersexo", value: "intersexo" },
  { label: "Prefiro não informar", value: "nao_informado" },
];

const localizacaoOptions = [
  { label: "Apenas na lombar", value: "lombar_apenas" as const },
  { label: "Lombar que desce para as pernas", value: "lombar_pernas" as const },
  { label: "Lombar e quadril", value: "lombar_quadril" as const },
];

const gatilhoOptions = [
  { label: "Ficar muito tempo em pé", value: "tempo_em_pe" },
  { label: "Ao sentar/levantar", value: "sentar_levantar" },
  { label: "Após carregar peso", value: "carregar_peso" },
  { label: "Piora ao tossir/espirrar", value: "tossir_espirrar" },
];

const comorbidadeOptions = [
  { label: "Diabetes (E10-E14)", value: "E11" },
  { label: "Hipertensão (I10)", value: "I10" },
  { label: "Artrite/Artrose (M00-M25)", value: "M19" },
  { label: "Fibromialgia (M79.7)", value: "M79.7" },
  { label: "Hérnia de disco (M51)", value: "M51" },
];

const emocionalOptions = [
  { label: "Ansioso(a)", value: "ansioso" },
  { label: "Triste/desanimado(a)", value: "triste" },
  { label: "Estressado(a)", value: "estressado" },
  { label: "Bem/equilibrado(a)", value: "equilibrado" },
];

const picsOptions: { label: string; value: UsoPics }[] = [
  { label: "Sim, atualmente", value: "usa_atualmente" },
  { label: "Já fiz no passado", value: "ja_usou_passado" },
  { label: "Nunca fiz", value: "nunca_usou" },
];

const redFlagQuestions: { key: keyof RedFlagsInput; label: string }[] = [
  { key: "trauma_recente", label: "Sofreu algum trauma/queda recente?" },
  { key: "perda_peso_inexplicada", label: "Perdeu peso sem explicação nas últimas semanas?" },
  { key: "febre_persistente", label: "Está com febre persistente?" },
  { key: "incontinencia_urinaria", label: "Apresenta incontinência urinária ou fecal nova?" },
  { key: "dor_noturna_intensa", label: "A dor é intensa e te acorda à noite?" },
  { key: "fraqueza_progressiva", label: "Sente fraqueza progressiva nas pernas?" },
  { key: "historico_cancer", label: "Possui histórico de câncer?" },
];

export function Chatbot() {
  const [bubbles, setBubbles] = useState<Bubble[]>([
    {
      side: "bot",
      text:
        "Olá! Sou o assistente do Lombar Ativa, do NEPP/UNICAMP. Antes de começar, preciso do seu aceite ao Termo de Consentimento (LGPD). Seus dados serão usados de forma anônima para pesquisa.",
    },
  ]);
  const [state, setState] = useState<ChatState>(initialState);
  const [pending, startTransition] = useTransition();
  const [redFlagIdx, setRedFlagIdx] = useState(0);
  const [followUpResult, setFollowUpResult] = useState<{
    token: string;
    canal: string;
  } | null>(null);

  const chatBodyRef = useRef<HTMLDivElement>(null);

  // Auto-scroll para o fim sempre que aparece bubble nova ou o passo muda
  // (o "controles" muda de altura entre passos e pode esconder a última bubble).
  useEffect(() => {
    const el = chatBodyRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [bubbles, state.step]);

  const addBot = (t: string) => setBubbles((b) => [...b, { side: "bot", text: t }]);
  const addUser = (t: string) => setBubbles((b) => [...b, { side: "user", text: t }]);

  // ---------- LGPD ----------
  const handleAceitar = () => {
    addUser("Sim, aceito participar");
    startTransition(async () => {
      const r = await aceitarTcle();
      setState((s) => ({ ...s, participanteId: r.participanteId, step: "red_flags" }));
      addBot(
        "Obrigado! Antes do plano de cuidado, preciso checar alguns sinais de alerta. Vou te fazer 7 perguntas rápidas.",
      );
      addBot(redFlagQuestions[0].label);
    });
  };

  // ---------- Red flags (sequencial) ----------
  const handleRedFlag = (resposta: boolean) => {
    const q = redFlagQuestions[redFlagIdx];
    addUser(resposta ? "Sim" : "Não");

    const novosFlags = { ...state.redFlags, [q.key]: resposta };
    const novoIdx = redFlagIdx + 1;

    if (novoIdx < redFlagQuestions.length) {
      setState((s) => ({ ...s, redFlags: novosFlags }));
      setRedFlagIdx(novoIdx);
      setTimeout(() => addBot(redFlagQuestions[novoIdx].label), 300);
      return;
    }

    // Todas respondidas — gravar e decidir
    setState((s) => ({ ...s, redFlags: novosFlags }));
    startTransition(async () => {
      const r = await gravarRedFlags(novosFlags);
      if (r.encerrado) {
        setState((s) => ({ ...s, step: "red_flag_stop" }));
        addBot(
          "⚠ Algumas das suas respostas indicam que você precisa de avaliação médica presencial antes de continuar com autocuidado. Procure uma UBS, pronto-socorro ou seu médico. O autocuidado pelo portal não substitui essa avaliação.",
        );
      } else {
        setState((s) => ({ ...s, step: "demografia_idade" }));
        addBot("Ótimo, sem sinais de alerta. Vamos ao seu perfil. Qual a sua idade?");
      }
    });
  };

  // ---------- Demografia ----------
  const handleIdade = (idade: number) => {
    addUser(`${idade} anos`);
    setState((s) => ({ ...s, demografia: { ...s.demografia, idade }, step: "demografia_sexo" }));
    setTimeout(() => addBot("Qual seu sexo biológico?"), 300);
  };

  const handleSexo = (v: SexoBiologico) => {
    addUser(sexoOptions.find((o) => o.value === v)!.label);
    setState((s) => ({ ...s, demografia: { ...s.demografia, sexo: v }, step: "demografia_raca" }));
    setTimeout(() => addBot("Como você se autodeclara (raça/cor)?"), 300);
  };

  const handleRaca = (v: RacaCor) => {
    addUser(racaOptions.find((o) => o.value === v)!.label);
    setState((s) => ({ ...s, demografia: { ...s.demografia, raca: v }, step: "demografia_escolaridade" }));
    setTimeout(() => addBot("Qual seu nível de escolaridade?"), 300);
  };

  const handleEscolaridade = (v: Escolaridade) => {
    addUser(escolaridadeOptions.find((o) => o.value === v)!.label);
    const dem = { ...state.demografia, escolaridade: v };
    setState((s) => ({ ...s, demografia: dem, step: "clinico_localizacao" }));
    startTransition(async () => {
      await gravarDemografia({
        idade: dem.idade!,
        sexo: dem.sexo!,
        raca: dem.raca!,
        escolaridade: v,
      });
      addBot("Onde exatamente você sente a dor agora?");
    });
  };

  // ---------- Clínico ----------
  const handleLocalizacao = (v: typeof localizacaoOptions[number]["value"]) => {
    addUser(localizacaoOptions.find((o) => o.value === v)!.label);
    setState((s) => ({ ...s, clinico: { ...s.clinico, localizacao_dor: v }, step: "clinico_gatilho" }));
    setTimeout(() => addBot("Essa dor aparece ou piora em qual situação?"), 300);
  };

  const handleGatilho = (v: string) => {
    addUser(gatilhoOptions.find((o) => o.value === v)!.label);
    setState((s) => ({ ...s, clinico: { ...s.clinico, gatilho: v }, step: "clinico_comorbidades" }));
    setTimeout(
      () => addBot("Você possui alguma dessas condições? (pode marcar mais de uma)"),
      300,
    );
  };

  const toggleComorbidade = (v: string) => {
    setState((s) => {
      const sel = s.clinico.comorbidades_cid10.includes(v)
        ? s.clinico.comorbidades_cid10.filter((x) => x !== v)
        : [...s.clinico.comorbidades_cid10, v];
      return { ...s, clinico: { ...s.clinico, comorbidades_cid10: sel } };
    });
  };

  const handleComorbidadesDone = () => {
    const n = state.clinico.comorbidades_cid10.length;
    addUser(n === 0 ? "Nenhuma" : `${n} condição(ões) registrada(s)`);
    setState((s) => ({ ...s, step: "clinico_emocional" }));
    setTimeout(
      () => addBot("Como você tem se sentido emocionalmente nos últimos dias?"),
      300,
    );
  };

  const toggleEmocional = (v: string) => {
    setState((s) => {
      const sel = s.clinico.estado_emocional.includes(v)
        ? s.clinico.estado_emocional.filter((x) => x !== v)
        : [...s.clinico.estado_emocional, v];
      return { ...s, clinico: { ...s.clinico, estado_emocional: sel } };
    });
  };

  const handleEmocionalDone = () => {
    const n = state.clinico.estado_emocional.length;
    addUser(n === 0 ? "Sem registro" : `${n} estado(s)`);
    setState((s) => ({ ...s, step: "clinico_eva_d0" }));
    setTimeout(
      () => addBot("De 0 a 10, qual o nível da sua dor lombar agora? (0 = sem dor; 10 = pior dor possível)"),
      300,
    );
  };

  const handleEva = (valor: number) => {
    addUser(`Nota ${valor}`);
    const c = { ...state.clinico, eva_d0: valor };
    setState((s) => ({ ...s, clinico: c, step: "pics_historico" }));
    startTransition(async () => {
      await gravarClinico({
        localizacao_dor: c.localizacao_dor!,
        gatilho: c.gatilho!,
        comorbidades_cid10: c.comorbidades_cid10,
        estado_emocional: c.estado_emocional,
        eva_d0: valor,
      });
      addBot(
        "Quase lá. Você usa ou já usou Práticas Integrativas (meditação, yoga, acupuntura)?",
      );
    });
  };

  // ---------- PICS ----------
  const handlePics = (v: UsoPics) => {
    addUser(picsOptions.find((o) => o.value === v)!.label);
    setState((s) => ({ ...s, pics: { ...s.pics, historico: v }, step: "pics_audio_offer" }));
    setTimeout(
      () =>
        addBot(
          "Posso te oferecer uma meditação guiada de 5 minutos para a região lombar?",
        ),
      300,
    );
  };

  const handleAudio = (acessou: boolean) => {
    addUser(acessou ? "Sim, quero ouvir" : "Agora não");
    const p = { ...state.pics, acessou_audio: acessou };
    setState((s) => ({ ...s, pics: p, step: "follow_up_optin" }));
    startTransition(async () => {
      await gravarPics({
        historico: p.historico!,
        praticas: [],
        acessou_audio: acessou,
      });
      addBot(
        "Por último: posso te lembrar daqui a 7 dias para reavaliar a sua dor? Se quiser, deixe um e-mail (opcional). Sem e-mail, te dou um link copiável.",
      );
    });
  };

  // ---------- Follow-up ----------
  const handleFollowUp = (email: string | null) => {
    addUser(email ? `E-mail informado: ${email}` : "Sem e-mail, prefiro o link");
    startTransition(async () => {
      const r = await agendarFollowUp({ email: email ?? undefined });
      setFollowUpResult({ token: r.token, canal: r.canal });
      setState((s) => ({ ...s, step: "conteudo" }));
      addBot(
        r.canal === "email"
          ? "Ótimo! Te lembraremos por e-mail. Enquanto isso, aqui está seu plano de cuidado:"
          : "Anotado. Salve o link de retorno (abaixo) para reavaliar daqui a 7 dias. Aqui está seu plano:",
      );
    });
  };

  return (
    <div className="mx-auto max-w-[700px] overflow-hidden rounded-md border-[3px] border-black bg-white">
      <div className="bg-[var(--color-nepp-blue)] px-5 py-4 text-center text-lg font-bold uppercase text-white">
        Assistente Lombar Ativa
      </div>

      <div
        ref={chatBodyRef}
        className="flex max-h-[60vh] flex-col gap-3 overflow-y-auto bg-[var(--color-mute)] p-5"
      >
        {bubbles.map((b, i) => (
          <ChatBubble key={i} side={b.side}>
            {b.text}
          </ChatBubble>
        ))}
      </div>

      <div className="border-t-[3px] border-black bg-[var(--color-mute-2)] p-5">
        {pending && (
          <p className="mb-2 text-sm italic opacity-70">Salvando…</p>
        )}

        {state.step === "lgpd" && (
          <SingleChoice
            options={[{ label: "Sim, aceito o TCLE e quero participar", value: "ok" }]}
            onChoose={handleAceitar}
            variant="primary"
          />
        )}

        {state.step === "red_flags" && (
          <SingleChoice
            options={[
              { label: "Não", value: "no" },
              { label: "Sim", value: "yes" },
            ]}
            onChoose={(v) => handleRedFlag(v === "yes")}
          />
        )}

        {state.step === "red_flag_stop" && (
          <p className="text-base font-medium text-[var(--color-unicamp-red)]">
            O fluxo de autocuidado foi interrompido por segurança. Procure
            atendimento médico presencial.
          </p>
        )}

        {state.step === "demografia_idade" && <IdadeInput onSubmit={handleIdade} />}

        {state.step === "demografia_sexo" && (
          <SingleChoice options={sexoOptions} onChoose={handleSexo} />
        )}

        {state.step === "demografia_raca" && (
          <SingleChoice options={racaOptions} onChoose={handleRaca} />
        )}

        {state.step === "demografia_escolaridade" && (
          <SingleChoice options={escolaridadeOptions} onChoose={handleEscolaridade} />
        )}

        {state.step === "clinico_localizacao" && (
          <SingleChoice options={localizacaoOptions} onChoose={handleLocalizacao} />
        )}

        {state.step === "clinico_gatilho" && (
          <SingleChoice options={gatilhoOptions} onChoose={handleGatilho} />
        )}

        {state.step === "clinico_comorbidades" && (
          <MultiChoice
            options={comorbidadeOptions}
            selected={state.clinico.comorbidades_cid10}
            onToggle={toggleComorbidade}
            onDone={handleComorbidadesDone}
          />
        )}

        {state.step === "clinico_emocional" && (
          <MultiChoice
            options={emocionalOptions}
            selected={state.clinico.estado_emocional}
            onToggle={toggleEmocional}
            onDone={handleEmocionalDone}
          />
        )}

        {state.step === "clinico_eva_d0" && <EvaScale onChoose={handleEva} />}

        {state.step === "pics_historico" && (
          <SingleChoice options={picsOptions} onChoose={handlePics} />
        )}

        {state.step === "pics_audio_offer" && (
          <SingleChoice
            options={[
              { label: "Sim, quero ouvir", value: "y" },
              { label: "Agora não", value: "n" },
            ]}
            onChoose={(v) => handleAudio(v === "y")}
          />
        )}

        {state.step === "follow_up_optin" && <EmailOptin onSubmit={handleFollowUp} />}

        {state.step === "conteudo" && (
          <ConteudoAdaptativo
            escolaridade={state.demografia.escolaridade ?? null}
            followUp={followUpResult}
          />
        )}
      </div>
    </div>
  );
}

// ---------- subcomponentes locais ----------

function IdadeInput({ onSubmit }: { onSubmit: (v: number) => void }) {
  const [val, setVal] = useState("");
  return (
    <div className="flex flex-wrap items-center gap-3">
      <label htmlFor="idade-input" className="sr-only">
        Idade
      </label>
      <input
        id="idade-input"
        type="number"
        inputMode="numeric"
        min={0}
        max={120}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        placeholder="Ex: 45"
        className="h-11 w-28 rounded-md border-2 border-black px-3 text-base"
      />
      <button
        type="button"
        disabled={!val}
        onClick={() => onSubmit(Number(val))}
        className="h-11 cursor-pointer rounded-md border-2 border-black bg-black px-5 font-extrabold text-[var(--color-accent-gold)] disabled:opacity-50"
      >
        OK
      </button>
    </div>
  );
}

function EvaScale({ onChoose }: { onChoose: (v: number) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {Array.from({ length: 11 }, (_, i) => i).map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChoose(n)}
          className="h-11 min-w-[44px] cursor-pointer rounded-md border-2 border-black bg-white px-3 font-bold hover:bg-[var(--color-nepp-blue)] hover:text-white"
        >
          {n}
        </button>
      ))}
    </div>
  );
}

function EmailOptin({ onSubmit }: { onSubmit: (email: string | null) => void }) {
  const [email, setEmail] = useState("");
  return (
    <div className="flex flex-wrap items-center gap-3">
      <label htmlFor="email-input" className="sr-only">
        E-mail (opcional)
      </label>
      <input
        id="email-input"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="seu@email.com (opcional)"
        className="h-11 w-64 rounded-md border-2 border-black px-3 text-base"
      />
      <button
        type="button"
        onClick={() => onSubmit(email.trim() ? email.trim() : null)}
        className="h-11 cursor-pointer rounded-md border-2 border-black bg-[var(--color-unicamp-red)] px-5 font-extrabold text-white"
      >
        {email.trim() ? "Quero lembrete por e-mail" : "Continuar sem e-mail"}
      </button>
    </div>
  );
}
