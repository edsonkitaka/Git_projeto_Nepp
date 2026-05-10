import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Chatbot } from "./_components/chatbot";

export const metadata = {
  title: "Avaliação — Lombar Ativa | NEPP/UNICAMP",
};

export default function AvaliacaoPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-[800px] px-5 py-10">
        <header className="mb-6 text-center">
          <h1 className="m-0 text-2xl font-extrabold text-[var(--color-nepp-blue)]">
            Avaliação clínica adaptativa
          </h1>
          <p className="mx-auto mt-2 max-w-[600px] text-base">
            Suas respostas são anônimas e confidenciais (LGPD). O que você
            informar aqui contribui para o Observatório de Saúde do NEPP/UNICAMP.
          </p>
        </header>
        <Chatbot />
      </main>
      <SiteFooter />
    </>
  );
}
