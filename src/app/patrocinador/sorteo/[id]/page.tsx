import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSponsor } from "@/lib/auth";
import { now as clockNow } from "@/lib/clock";
import { raffleStats } from "@/lib/stats";
import { ACTION_LABEL, raffleState, STATE_LABEL, TYPE_LABEL } from "@/lib/raffles";
import { formatDateTime } from "@/lib/time";
import { euros } from "@/lib/format";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { cancelRaffleAction, markDeliveredAction } from "@/app/actions/sponsor";

export default async function SponsorRafflePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ creado?: string }> }) {
  const user = await requireSponsor();
  const { id } = await params;
  const { creado } = await searchParams;
  const raffle = await prisma.raffle.findUnique({ where: { id }, include: { draw: true, deliveries: { include: { user: true }, orderBy: { rank: "asc" } } } });
  if (!raffle || (raffle.sponsorId !== user.sponsor.id && user.role !== "ADMIN")) notFound();
  const now = await clockNow();
  const st = raffleState(raffle, now);
  const stats = await raffleStats(id);
  const leads = await prisma.lead.findMany({ where: { action: { raffleId: id } }, orderBy: { createdAt: "desc" }, take: 20 });

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <Link href="/patrocinador" className="text-sm font-medium text-violet-600 hover:underline">← Mis sorteos</Link>
      {creado && (
        <p className="card border-emerald-300 bg-emerald-50 p-4 text-emerald-800">
          ✅ Sorteo creado. {raffle.status === "PENDING" ? "Lo revisaremos y te avisaremos cuando esté aprobado." : "Ya está programado."}
        </p>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="h1">{raffle.emoji} {raffle.title}</h1>
          <p className="text-sm text-violet-600">
            {TYPE_LABEL[raffle.type]} · {euros(raffle.prizeValue.toString())} · {formatDateTime(raffle.startAt)} → {formatDateTime(raffle.endAt)}
          </p>
          {raffle.rejectReason && <p className="mt-1 text-sm text-rose-700">Motivo del rechazo: {raffle.rejectReason}</p>}
        </div>
        <div className="flex items-center gap-2">
          <span className="badge bg-violet-100 py-1.5 text-violet-800" data-testid="sponsor-raffle-state">{STATE_LABEL[st]}</span>
          <Link href={`/sorteo/${raffle.id}`} className="btn-ghost py-1.5">Ver público</Link>
          {(st === "pending" || st === "scheduled") && (
            <form action={cancelRaffleAction}>
              <input type="hidden" name="raffleId" value={raffle.id} />
              <button className="btn-danger py-1.5">Cancelar</button>
            </form>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card p-4"><p className="text-xs uppercase text-violet-500">Participantes</p><p className="text-3xl font-black">{stats.participants}</p></div>
        <div className="card p-4"><p className="text-xs uppercase text-violet-500">Papeletas</p><p className="text-3xl font-black">{raffle.ticketCount}</p></div>
        <div className="card p-4"><p className="text-xs uppercase text-violet-500">Leads</p><p className="text-3xl font-black">{stats.leads}</p></div>
      </div>

      <section className="card overflow-x-auto p-5">
        <h2 className="h2">Resultados por acción</h2>
        <table className="table mt-2">
          <thead><tr><th>Acción</th><th>Tipo</th><th>Iniciadas</th><th>Completadas</th><th>Conversión</th></tr></thead>
          <tbody>
            {stats.actions.map((a) => (
              <tr key={a.id}>
                <td>{a.isUnlock && <span className="badge mr-1 bg-violet-600 text-white">Desbloqueo</span>}{a.label}</td>
                <td>{ACTION_LABEL[a.type]}</td>
                <td>{a.started}</td>
                <td className="font-bold">{a.completed}</td>
                <td>{a.started ? Math.round((a.completed / a.started) * 100) : 0} %</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {stats.leads > 0 && (
        <section className="card overflow-x-auto p-5">
          <div className="flex items-center justify-between">
            <h2 className="h2">Leads ({stats.leads})</h2>
            <a href={`/api/leads/${raffle.id}`} className="btn-ghost py-1.5" data-testid="leads-csv">⬇️ Descargar CSV</a>
          </div>
          <table className="table mt-2">
            <thead><tr><th>Nombre</th><th>Email</th><th>Teléfono</th><th>Respuesta</th><th>Fecha</th></tr></thead>
            <tbody>
              {leads.map((l) => (
                <tr key={l.id}><td>{l.name}</td><td>{l.email}</td><td>{l.phone ?? "—"}</td><td>{l.answer ?? "—"}</td><td className="text-xs">{formatDateTime(l.createdAt)}</td></tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {raffle.draw && (
        <section className="card space-y-3 p-5">
          <h2 className="h2">🏆 Ganador y entrega</h2>
          {raffle.draw.winnerNumbers.length === 0 && <p className="text-sm text-violet-600">El sorteo cerró sin participantes.</p>}
          {raffle.deliveries.map((d) => (
            <div key={d.id} className="rounded-xl border border-violet-100 p-4 text-sm">
              <p className="font-semibold">
                {d.rank === 0 ? "Ganador" : `Suplente ${d.rank}`} · papeleta #{raffle.draw!.winnerNumbers[d.rank]} ·{" "}
                <span className="badge bg-violet-100 text-violet-800">{{ PENDING_CLAIM: "Esperando que acepte", CLAIMED: "Aceptado: pendiente de entrega", DELIVERED: "Entregado", EXPIRED: "Caducado" }[d.status]}</span>
              </p>
              {(d.status === "CLAIMED" || d.status === "DELIVERED") && (
                <p className="mt-1 text-violet-700">
                  {d.user.name} · {d.user.email} · {d.user.phone ?? ""} {d.shippingAddress && <><br />📦 {d.shippingAddress}</>}
                </p>
              )}
              {d.status === "CLAIMED" && (
                <ActionForm action={markDeliveredAction} className="mt-2 flex flex-wrap gap-2">
                  <input type="hidden" name="deliveryId" value={d.id} />
                  <input name="notes" className="input max-w-xs" placeholder="Nota (ej.: código del cupón o nº de seguimiento)" />
                  <SubmitButton className="btn-primary">Marcar como entregado</SubmitButton>
                </ActionForm>
              )}
            </div>
          ))}
        </section>
      )}
    </main>
  );
}
