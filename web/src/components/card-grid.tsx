type CardItem = { title: string; body: string };

export function CardGrid({ items }: { items: CardItem[] }) {
  return (
    <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <article
          key={item.title}
          className="border-[3px] border-black bg-[var(--color-paper)] p-6"
        >
          <h3 className="mb-3 text-[var(--text-xl)] font-bold text-[var(--color-nepp-blue)] underline decoration-[3px] underline-offset-4">
            {item.title}
          </h3>
          <p className="m-0 font-medium text-[var(--color-ink)]">{item.body}</p>
        </article>
      ))}
    </div>
  );
}
