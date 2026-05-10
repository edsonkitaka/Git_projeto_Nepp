import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b-[5px] border-[var(--color-unicamp-red)] bg-[var(--color-paper)] shadow-sm">
      <div className="mx-auto flex max-w-[1200px] items-center justify-between px-5 py-4">
        <Link
          href="/"
          className="text-xl font-extrabold uppercase tracking-tight text-[var(--color-nepp-blue)]"
        >
          UNICAMP <span className="opacity-60">|</span> NEPP
        </Link>
        <nav aria-label="Principal" className="hidden gap-6 text-sm font-bold sm:flex">
          <Link href="/#sobre" className="text-[var(--color-ink)] hover:text-[var(--color-unicamp-red)]">
            Sobre
          </Link>
          <Link href="/avaliacao" className="text-[var(--color-ink)] hover:text-[var(--color-unicamp-red)]">
            Avaliação
          </Link>
          <Link href="/#pesquisa" className="text-[var(--color-ink)] hover:text-[var(--color-unicamp-red)]">
            Pesquisa
          </Link>
        </nav>
      </div>
    </header>
  );
}
