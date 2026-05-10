import { createHash } from "node:crypto";

// Hash determinístico para e-mail e IP — nunca armazenamos PII em claro.
// Salt vem de env var em produção; em dev, fallback constante (NÃO usar em prod real).
const SALT = process.env.NEPP_HASH_SALT ?? "nepp-mvp-local-dev-salt";

export function sha256Hex(input: string): string {
  return createHash("sha256").update(SALT + input).digest("hex");
}

export function emailDomain(email: string): string | null {
  const at = email.lastIndexOf("@");
  if (at <= 0 || at === email.length - 1) return null;
  return email.slice(at + 1).toLowerCase().trim();
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
