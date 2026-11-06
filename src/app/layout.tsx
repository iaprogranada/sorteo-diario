import type { Metadata } from "next";
import "./globals.css";
import { Header, Footer } from "@/components/Header";

export const metadata: Metadata = {
  title: "Sorteo Diario — sorteos gratis cada día",
  description: "Cada día nuevos sorteos gratis de premios de marcas y negocios. Desbloquea, consigue papeletas y gana.",
};

export const dynamic = "force-dynamic";

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className="min-h-screen antialiased">
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}
