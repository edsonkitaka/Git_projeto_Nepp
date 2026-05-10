"use client";

type Option<T extends string | number> = {
  label: string;
  value: T;
};

type SingleProps<T extends string | number> = {
  options: Option<T>[];
  onChoose: (value: T) => void;
  variant?: "default" | "primary";
};

export function SingleChoice<T extends string | number>({
  options,
  onChoose,
  variant = "default",
}: SingleProps<T>) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          onClick={() => onChoose(o.value)}
          className={
            "min-h-[44px] cursor-pointer rounded-md border-2 border-black px-4 py-2 text-base font-bold transition " +
            (variant === "primary"
              ? "bg-[var(--color-unicamp-red)] text-white hover:bg-black"
              : "bg-white text-black hover:bg-[var(--color-nepp-blue)] hover:text-white")
          }
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

type MultiProps<T extends string> = {
  options: Option<T>[];
  selected: T[];
  onToggle: (value: T) => void;
  onDone: () => void;
  doneLabel?: string;
};

export function MultiChoice<T extends string>({
  options,
  selected,
  onToggle,
  onDone,
  doneLabel = "Confirmar",
}: MultiProps<T>) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const isSel = selected.includes(o.value);
        return (
          <button
            key={String(o.value)}
            type="button"
            aria-pressed={isSel}
            onClick={() => onToggle(o.value)}
            className={
              "min-h-[44px] cursor-pointer rounded-md border-2 border-black px-4 py-2 text-base font-bold transition " +
              (isSel
                ? "bg-[var(--color-unicamp-red)] text-white"
                : "bg-white text-black hover:bg-[var(--color-nepp-blue)] hover:text-white")
            }
          >
            {isSel ? "✓ " : ""}
            {o.label}
          </button>
        );
      })}
      <button
        type="button"
        onClick={onDone}
        className="min-h-[44px] cursor-pointer rounded-md border-2 border-black bg-black px-5 py-2 text-base font-extrabold text-[var(--color-accent-gold)] transition hover:bg-[var(--color-nepp-blue)]"
      >
        {doneLabel} →
      </button>
    </div>
  );
}
