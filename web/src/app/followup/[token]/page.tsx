import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getRepository } from "@/lib/db/repository";
import { FollowUpForm } from "./follow-up-form";
import { notFound } from "next/navigation";

type Props = { params: Promise<{ token: string }> };

export const metadata = { title: "Reavaliação — Lombar Ativa | NEPP/UNICAMP" };

export default async function FollowUpPage({ params }: Props) {
  const { token } = await params;
  const repo = await getRepository();
  const p = await repo.findParticipanteByFollowupToken(token);
  if (!p) notFound();

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-[700px] px-5 py-12">
        <h1 className="m-0 text-2xl font-extrabold text-[var(--color-nepp-blue)]">
          Reavaliação após 7 dias
        </h1>
        <p className="mt-3 text-base">
          Olá novamente. Reavaliar como sua dor está hoje nos ajuda a entender
          se as orientações estão funcionando — para você e para outras pessoas
          com dor lombar crônica.
        </p>

        <p className="mt-6 text-base font-semibold">
          De 0 a 10, qual o nível da sua dor lombar agora?
          <br />
          <span className="text-sm font-normal opacity-70">
            (0 = sem dor; 10 = pior dor possível)
          </span>
        </p>

        <FollowUpForm token={token} />
      </main>
      <SiteFooter />
    </>
  );
}
