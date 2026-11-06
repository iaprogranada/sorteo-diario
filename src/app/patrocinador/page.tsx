import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireSponsor } from "@/lib/auth";
import { now as clockNow } from "@/lib/clock";
import { tickSafe } from "@/lib/engine";
import { raffleState, STATE_LABEL, TYPE_LABEL } from "@/lib/raffles";
import { formatDateTime } from "@/lib/time";

export default async function SponsorDashboard() {
  await tickSafe();
  const user = await requireSponsor();
  const now = await clockNow();
  const raffles = await prisma.raffle.findMany({
    where: { sponsorId: user.sponsor.id },
    include: { actions: { include: { _count: { select: { completions: true } } } }, _count: { select: { tickets: true } } },
    orderBy: { startAt: "desc" },
  });
  const leads = await prisma.lead.count({ where: { action: { raffle: { sponsorId: user.sponsor.id } } } });
  const participantsTotal = await prisma.ticket.groupBy({ by: ["userId"], where: { raffle: { sponsorId: user.sponsor.id } } }).then((g) => g.length);
  const interactions = raffles.reduce((a, r) => a + r.actions.reduce((b, x) => b + x._count.completions, 0), 0);

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-violet-500">Panel de patrocinador</p>
          <h1 className="h1">{user.sponsor.companyName}</h1>
        </div>
        <Link href="/patrocinador/nuevo" className="btn-primary" data-testid="new-raffle">+ Nuevo sorteo</Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-4">
        <Kpi label="Sorteos" value={raffles.length} />
        <Kpi label="Personas alcanzadas" value={participantsTotal} />
        <Kpi label="Interacciones" value={interactions} hint="vídeos, visitas, seguidores…" />
        <Kpi label="Leads" value={leads} />
      </div>
      <div className="card overflow-x-auto">
        <table className="table">
          <thead>
            <tr><th>Sorteo</th><th>Tipo</th><th>Estado</th><th>Fechas</th><th>Papeletas</th><th></th></tr>
          </thead>
          <tbody>
            {raffles.map((r) => {
              const st = raffleState(r, now);
              return (
                <tr key={r.id}>
                  <td className="font-semibold text-violet-950">{r.emoji} {r.title}</td>
                  <td>{TYPE_LABEL[r.type]}</td>
                  <td><span className="badge bg-violet-100 text-violet-800">{STATE_LABEL[st]}</span></td>
                  <td className="whitespace-nowrap text-xs text-violet-500">{formatDateTime(r.startAt)} → {formatDateTime(r.endAt)}</td>
                  <td>{r.ticketCount}</td>
                  <td><Link href={`/patrocinador/sorteo/${r.id}`} className="font-semibold text-violet-600 hover:underline">Estadísticas</Link></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {raffles.length === 0 && (
          <div className="p-8 text-center">
            <p className="text-4xl">🎁</p>
            <p className="mt-2 font-semibold text-violet-950">Aún no tienes sorteos</p>
            <p className="text-sm text-violet-600">Crea el primero: es gratis durante el lanzamiento.</p>
          </div>
        )}
      </div>
    </main>
  );
}

function Kpi({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-violet-500">{label}</p>
      <p className="mt-1 text-3xl font-black text-violet-950">{value.toLocaleString("es-ES")}</p>
      {hint && <p className="text-xs text-violet-400">{hint}</p>}
    </div>
  );
}
