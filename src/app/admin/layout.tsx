import Link from "next/link";
import { requireAdmin } from "@/lib/auth";

const NAV = [
  ["/admin", "Resumen"],
  ["/admin/sorteos", "Sorteos"],
  ["/admin/entregas", "Premios"],
  ["/admin/banners", "Banners"],
  ["/admin/usuarios", "Usuarios"],
  ["/admin/fraude", "Antifraude"],
  ["/admin/ajustes", "Ajustes"],
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <nav className="mb-6 flex flex-wrap gap-1 rounded-2xl bg-violet-950 p-1.5 text-sm font-semibold">
        {NAV.map(([href, label]) => (
          <Link key={href} href={href} className="rounded-xl px-3 py-1.5 text-violet-200 hover:bg-violet-800 hover:text-white">{label}</Link>
        ))}
        <Link href="/patrocinador/nuevo" className="ml-auto rounded-xl bg-amber-400 px-3 py-1.5 text-violet-950">+ Crear sorteo</Link>
      </nav>
      {children}
    </div>
  );
}
