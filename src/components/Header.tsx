import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { wildcardBalance, registerDailyLogin } from "@/lib/rewards";
import { getClockOffsetMs, testClockEnabled } from "@/lib/clock";
import { logoutAction } from "@/app/actions/auth";

export async function Header() {
  const user = await getCurrentUser();
  let balance = 0;
  let unread = 0;
  if (user) {
    if (user.role === "USER") await registerDailyLogin(user.id);
    [balance, unread] = await Promise.all([
      wildcardBalance(user.id),
      prisma.notification.count({ where: { userId: user.id, read: false } }),
    ]);
  }
  const offset = await getClockOffsetMs();
  return (
    <>
      {testClockEnabled() && (
        <div className="bg-amber-300 px-4 py-1 text-center text-xs font-semibold text-violet-950" data-testid="test-banner">
          🧪 Entorno de pruebas · datos ficticios
          {offset !== 0 && ` · reloj adelantado ${Math.round(offset / 3_600_000)} h`}
        </div>
      )}
      <header className="sticky top-0 z-30 border-b border-violet-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
          <Link href="/" className="flex items-center gap-2 text-lg font-black tracking-tight text-violet-950">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-500 text-xl">🎟️</span>
            Sorteo<span className="-ml-1.5 text-violet-600">Diario</span>
          </Link>
          <nav className="flex items-center gap-1 text-sm font-medium text-violet-800">
            <Link href="/" className="rounded-lg px-2.5 py-1.5 hover:bg-violet-50">Sorteos</Link>
            <Link href="/ganadores" className="rounded-lg px-2.5 py-1.5 hover:bg-violet-50">Ganadores</Link>
            {user?.role === "USER" && <Link href="/ganar" className="rounded-lg px-2.5 py-1.5 hover:bg-violet-50">Gana comodines</Link>}
            {user?.sponsor && <Link href="/patrocinador" className="rounded-lg px-2.5 py-1.5 hover:bg-violet-50">Patrocinador</Link>}
            {user?.role === "ADMIN" && <Link href="/admin" className="rounded-lg px-2.5 py-1.5 hover:bg-violet-50">Admin</Link>}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            {user ? (
              <>
                {user.role === "USER" && (
                  <Link href="/perfil" className="badge bg-amber-100 py-1.5 text-sm text-amber-900" title="Comodines disponibles" data-testid="wildcard-balance">
                    🃏 {balance}
                  </Link>
                )}
                <Link href="/notificaciones" className="relative rounded-lg px-2 py-1.5 hover:bg-violet-50" title="Notificaciones">
                  🔔
                  {unread > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">{unread}</span>
                  )}
                </Link>
                <Link href="/perfil" className="max-w-32 truncate text-sm font-medium text-violet-900 hover:underline" data-testid="user-name">{user.name}</Link>
                <form action={logoutAction}>
                  <button className="text-xs text-violet-500 hover:text-violet-800">Salir</button>
                </form>
              </>
            ) : (
              <>
                <Link href="/entrar" className="btn-ghost py-2">Entrar</Link>
                <Link href="/registro" className="btn-primary py-2">Regístrate gratis</Link>
              </>
            )}
          </div>
        </div>
      </header>
      {user && user.role === "USER" && !user.phoneVerified && (
        <div className="bg-violet-600 px-4 py-2 text-center text-sm text-white">
          Verifica tu teléfono para participar y llevarte tus comodines de bienvenida.{" "}
          <Link href="/verificar-telefono" className="font-bold underline">Verificar ahora</Link>
        </div>
      )}
    </>
  );
}

export function Footer() {
  return (
    <footer className="mt-16 border-t border-violet-100 bg-white">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 text-sm text-violet-700 sm:grid-cols-3">
        <div>
          <p className="font-black text-violet-950">🎟️ Sorteo Diario</p>
          <p className="mt-2 text-violet-500">Sorteos nuevos cada día. Participar es 100 % gratis. Sorteos verificables.</p>
        </div>
        <div className="flex flex-col gap-1">
          <Link href="/como-funciona" className="hover:underline">Cómo funciona</Link>
          <Link href="/ganadores" className="hover:underline">Ganadores</Link>
          <Link href="/anunciate" className="hover:underline">Patrocina un sorteo o anúnciate</Link>
        </div>
        <div className="flex flex-col gap-1">
          <Link href="/legal/bases" className="hover:underline">Bases legales</Link>
          <Link href="/legal/privacidad" className="hover:underline">Privacidad</Link>
          <Link href="/legal/cookies" className="hover:underline">Cookies</Link>
          <Link href="/legal/aviso-legal" className="hover:underline">Aviso legal</Link>
        </div>
      </div>
      <p className="pb-6 text-center text-xs text-violet-400">© {new Date().getFullYear()} Sorteo Diario · Un proyecto de IA Pro · Solo mayores de 18 años</p>
    </footer>
  );
}
