type Props = {
  side: "bot" | "user";
  children: React.ReactNode;
};

export function ChatBubble({ side, children }: Props) {
  const isBot = side === "bot";
  return (
    <div
      className={`max-w-[85%] rounded-md border-2 px-4 py-3 text-base font-semibold leading-relaxed ${
        isBot
          ? "self-start border-[var(--color-nepp-blue)] bg-white text-black"
          : "self-end border-[var(--color-nepp-blue)] bg-[var(--color-nepp-blue)] text-white"
      }`}
      role={isBot ? "status" : undefined}
    >
      {children}
    </div>
  );
}
