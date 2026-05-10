import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lombar Ativa — Portal Observatório de Saúde | NEPP/UNICAMP",
  description:
    "Educação em dor e autocuidado baseado em evidências científicas. Iniciativa do Núcleo de Estudos de Políticas Públicas (NEPP) da UNICAMP.",
  authors: [{ name: "NEPP — Núcleo de Estudos de Políticas Públicas — UNICAMP" }],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#003366",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
