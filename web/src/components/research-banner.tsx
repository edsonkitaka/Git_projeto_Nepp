export function ResearchBanner() {
  return (
    <section
      id="pesquisa"
      className="bg-[var(--color-mute)] px-5 py-16"
      aria-labelledby="pesquisa-titulo"
    >
      <div className="mx-auto max-w-[1200px]">
        <h2
          id="pesquisa-titulo"
          className="text-[var(--text-2xl)] font-bold text-[var(--color-nepp-blue)]"
        >
          Observatório de Políticas Públicas
        </h2>
        <p className="mt-4 max-w-[800px]">
          Este portal coleta dados anônimos para o Núcleo de Estudos de
          Políticas Públicas da UNICAMP, ajudando a mapear o perfil da dor
          crônica na população brasileira e a eficácia de tratamentos não
          medicamentosos. Toda participação é regida pela LGPD e pelo Termo de
          Consentimento Livre e Esclarecido (TCLE).
        </p>
      </div>
    </section>
  );
}
