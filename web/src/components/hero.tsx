import Link from "next/link";

type HeroProps = {
  title: string;
  subtitle: string;
  cta: { label: string; href: string };
};

export function Hero({ title, subtitle, cta }: HeroProps) {
  return (
    <section className="bg-[var(--color-nepp-blue-deep)] px-5 py-20 text-center text-white">
      <h1 className="m-0 text-[var(--text-3xl)] font-extrabold uppercase tracking-tight text-[var(--color-accent-gold)]">
        {title}
      </h1>
      <p className="mx-auto mt-5 max-w-[800px] text-[var(--text-lg)] font-medium">
        {subtitle}
      </p>
      <Link
        href={cta.href}
        className="mt-8 inline-block rounded-md border-[3px] border-[var(--color-accent-gold)] bg-black px-8 py-4 text-[var(--text-lg)] font-extrabold text-[var(--color-accent-gold)] transition hover:bg-[var(--color-accent-gold)] hover:text-black"
      >
        {cta.label}
      </Link>
    </section>
  );
}
