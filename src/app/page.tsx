import Link from "next/link";
import { prisma } from "@/lib/db";
import { now as clockNow, getClockOffsetMs } from "@/lib/clock";
import { tickSafe } from "@/lib/engine";
import { liveRaffles, raffleCardInclude } from "@/lib/raffles";
import { dayKey, formatDateTime, startOfMadridDay } from "@/lib/time";
import { getCurrentUser } from "@/lib/auth";
import { RaffleCard } from "@/components/RaffleCard";
import { AdSlot } from "@/components/AdSlot";
import { maskName } from "@/lib/format";

export default async function Home({ searchParams }: { searchParams: Promise<{ cat?: string; bienvenida?: string }> }) {
  await tickSafe();
  const sp = await searchParams;
  const [now, offset, user] = await Promise.all([clockNow(), getClockOffsetMs(), getCurrentUser()]);
  let raffles = await liveRaffles(now);
  const categories = [...new Set(raffles.map((r) => r.category))].sort();
  if (sp.cat) raffles = raffles.filter((r) => r.category === sp.cat);

  const todayStart = startOfMadridDay(now);
  const special = raffles.filter((r) => r.type !== "REGULAR");
  const regular = raffles.filter((r) => r.type === "REGULAR");
  const today = regular.filter((r) => r.startAt >= todayStart);
  const endingSoon = regular.filter((r) => r.startAt < todayStart);
  const upcoming = await prisma.raffle.findMany({
    where: { status: "APPROVED", startAt: { gt: now } },
    include: raffleCardInclude,
    orderBy: { startAt: "asc" },
    take: 4,
  });
  const lastWinners = await prisma.draw.findMany({
    where: { winnerNumbers: { isEmpty: false } },
    include: { raffle: { select: { title: true, emoji: true, id: true } } },
    orderBy: { createdAt: "desc" },
    take: 5,
  });
  const winnerUsers = await prisma.user.findMany({ where: { id: { in: lastWinners.map((d) => d.winnerUserIds[0]) } }, select: { id: true, name: true, province: true } });

  return (
    <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6">
      <aside className="sticky top-24 hidden h-fit w-44 shrink-0 xl:block">
        <AdSlot position="LEFT" />
      </aside>

      <main className="min-w-0 flex-1 space-y-10">
        {sp.bienvenida && (
          <div className="card border-amber-300 bg-amber-50 p-4 text-amber-900">
            🎉 <b>¡Teléfono verificado!</b> Ya tienes tus comodines de bienvenida. Desbloquea un sorteo y úsalos donde quieras.
          </div>
        )}
        <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-violet-700 via-violet-600 to-fuchsia-500 p-6 text-white sm:p-10">
          <p className="badge bg-white/20 text-white">📅 {new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", weekday: "long", day: "numeric", month: "long" }).format(now)}</p>
          <h1 className="mt-3 max-w-2xl text-3xl font-black leading-tight sm:text-5xl">Sorteos nuevos cada día. Participar es gratis.</h1>
          <p className="mt-3 max-w-xl text-violet-100">
            Desbloquea el sorteo que te guste, consigue papeletas y súmale tus comodines. Cada sorteo es verificable: nadie puede amañar el resultado.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            {!user && <Link href="/registro" className="btn-accent px-6 py-3 text-base">Regístrate y llévate 10 comodines</Link>}
            <Link href="/como-funciona" className="btn rounded-xl bg-white/15 px-6 py-3 text-base text-white hover:bg-white/25">Cómo funciona</Link>
          </div>
          <div className="mt-6 flex flex-wrap gap-6 text-sm text-violet-100">
            <span>🎁 <b className="text-white">{raffles.length}</b> sorteos abiertos</span>
            <span>🎟️ <b className="text-white">{raffles.reduce((a, r) => a + r.ticketCount, 0)}</b> papeletas en juego</span>
          </div>
        </section>

        {categories.length > 1 && (
          <div className="flex flex-wrap gap-2">
            <Link href="/" className={`badge py-1.5 ${!sp.cat ? "bg-violet-600 text-white" : "bg-white text-violet-700 ring-1 ring-violet-200"}`}>Todos</Link>
            {categories.map((c) => (
              <Link key={c} href={`/?cat=${encodeURIComponent(c)}`} className={`badge py-1.5 ${sp.cat === c ? "bg-violet-600 text-white" : "bg-white text-violet-700 ring-1 ring-violet-200"}`}>
                {c}
              </Link>
            ))}
          </div>
        )}

        {special.length > 0 && (
          <Section title="⭐ Sorteos especiales" subtitle="Más días para participar y hasta 30 papeletas por persona">
            {special.map((r) => <RaffleCard key={r.id} r={r} offsetMs={offset} />)}
          </Section>
        )}
        <Section title="🆕 Sorteos de hoy" subtitle={`Publicados hoy ${dayKey(now).split("-").reverse().join("/")}`}>
          {today.length ? today.map((r) => <RaffleCard key={r.id} r={r} offsetMs={offset} />) : <Empty text="Los sorteos de hoy se publican a las 8:00." />}
        </Section>
        {endingSoon.length > 0 && (
          <Section title="⏳ Terminan pronto" subtitle="Última oportunidad">
            {endingSoon.map((r) => <RaffleCard key={r.id} r={r} offsetMs={offset} />)}
          </Section>
        )}

        {upcoming.length > 0 && (
          <section>
            <h2 className="h2">🔜 Próximamente</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {upcoming.map((r) => (
                <div key={r.id} className="card flex items-center gap-3 p-3 text-sm">
                  <span className="text-3xl">{r.emoji}</span>
                  <div>
                    <p className="font-semibold text-violet-950">{r.title}</p>
                    <p className="text-violet-500">Se abre el {formatDateTime(r.startAt)} · {r.sponsor.companyName}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {lastWinners.length > 0 && (
          <section>
            <div className="flex items-baseline justify-between">
              <h2 className="h2">🏆 Últimos ganadores</h2>
              <Link href="/ganadores" className="text-sm font-semibold text-violet-600 hover:underline">Ver todos</Link>
            </div>
            <ul className="card mt-3 divide-y divide-violet-50">
              {lastWinners.map((d) => {
                const u = winnerUsers.find((x) => x.id === d.winnerUserIds[0]);
                return (
                  <li key={d.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                    <span className="text-2xl">{d.raffle.emoji}</span>
                    <span className="flex-1">
                      <b>{maskName(u?.name)}</b>{u?.province ? ` (${u.province})` : ""} ganó <b>{d.raffle.title}</b> con la papeleta #{d.winnerNumbers[0]}
                    </span>
                    <Link href={`/verificar/${d.raffle.id}`} className="text-xs font-semibold text-violet-600 hover:underline">Verificar</Link>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <AdSlot position="FOOTER" />
      </main>

      <aside className="sticky top-24 hidden h-fit w-44 shrink-0 lg:block">
        <AdSlot position="RIGHT" />
      </aside>
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="h2">{title}</h2>
      {subtitle && <p className="text-sm text-violet-500">{subtitle}</p>}
      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{children}</div>
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="card col-span-full p-6 text-center text-sm text-violet-500">{text}</p>;
}
