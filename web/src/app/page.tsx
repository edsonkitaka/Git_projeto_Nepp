import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Hero } from "@/components/hero";
import { CardGrid } from "@/components/card-grid";
import { ResearchBanner } from "@/components/research-banner";

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main>
        <Hero
          title="Lombar Ativa"
          subtitle="Educação e autocuidado para o manejo da dor lombar crônica, baseado em evidências científicas."
          cta={{ label: "Começar avaliação", href: "/avaliacao" }}
        />

        <section
          id="sobre"
          className="mx-auto max-w-[1200px] px-5 py-16"
          aria-labelledby="sobre-titulo"
        >
          <h2
            id="sobre-titulo"
            className="text-[var(--text-2xl)] font-bold text-[var(--color-nepp-blue)]"
          >
            Como podemos ajudar hoje?
          </h2>

          <CardGrid
            items={[
              {
                title: "Entendendo sua dor",
                body: "A dor crônica não é apenas uma lesão física, mas uma sensibilidade do sistema nervoso. Aprenda a lidar com ela.",
              },
              {
                title: "Exercícios e mobilidade",
                body: "Vídeos com movimentos suaves, explicados passo a passo, para fortalecer e soltar sua coluna.",
              },
              {
                title: "Práticas integrativas",
                body: "Técnicas de relaxamento e meditação comprovadas para reduzir o desconforto constante.",
              },
            ]}
          />
        </section>

        <ResearchBanner />
      </main>
      <SiteFooter />
    </>
  );
}
