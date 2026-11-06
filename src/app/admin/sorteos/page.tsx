import Link from "next/link";
import { prisma } from "@/lib/db";
import { now as clockNow } from "@/lib/clock";
import { raffleState, STATE_LABEL, TYPE_LABEL, ACTION_LABEL } from "@/lib/raffles";
import { formatDateTime } from "@/lib/time";
import { euros } from "@/lib/format";
import { approveRaffleAction, rejectRaffleAction, forceDrawAction } from "@/app/actions/admin";

export default async function AdminRaffles() {
  const now = await clockNow();
  const pending = await prisma.raffle.findMany({ where: { status: "PENDING" }, include: { sponsor: true, actions: { orderBy: { order: "asc" } } }, orderBy: { createdAt: "asc" } });
  const all = await prisma.raffle.findMany({ where: { status: { not: "PENDING" } }, include: { sponsor: true }, orderBy: { startAt: "desc" }, take: 100 });
  return (
    <div className="space-y-8">
      <section>
        <h1 className="h1">Pendientes de aprobar ({pending.length})</h1>
        <div className="mt-4 space-y-4">
          {pending.map((r) => (
            <div key={r.id} className="card p-5" data-testid="pending-raffle">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-violet-500">{r.sponsor.logoEmoji} {r.sponsor.companyName}</p>
                  <p className="text-lg font-bold text-violet-950">{r.emoji} {r.title}</p>
                  <p className="text-sm text-violet-700">{r.description}</p>
                  <p className="mt-1 text-xs text-violet-500">
                    {TYPE_LABEL[r.type]} · {euros(r.prizeValue.toString())} · {formatDateTime(r.startAt)} → {formatDateTime(r.endAt)}
                  </p>
                  <ul className="mt-2 text-xs text-violet-700">
                    {r.actions.map((a) => (
                      <li key={a.id}>{a.isUnlock ? "🔓" : "•"} {ACTION_LABEL[a.type]}: {a.label} {a.url && <a href={a.url} target="_blank" rel="noopener" className="underline">{a.url}</a>}</li>
                    ))}
                  </ul>
                </div>
                <div className="flex flex-col gap-2">
                  <form action={approveRaffleAction}>
                    <input type="hidden" name="raffleId" value={r.id} />
                    <button className="btn-primary w-full" data-testid="approve">✅ Aprobar</button>
                  </form>
                  <form action={rejectRaffleAction} className="flex gap-1">
                    <input type="hidden" name="raffleId" value={r.id} />
                    <input name="reason" placeholder="Motivo" className="input w-40 py-1.5" />
                    <button className="btn-danger py-1.5">Rechazar</button>
                  </form>
                </div>
              </div>
            </div>
          ))}
          {pending.length === 0 && <p className="card p-6 text-center text-sm text-violet-500">No hay sorteos pendientes.</p>}
        </div>
      </section>

      <section>
        <h2 className="h2">Todos los sorteos</h2>
        <div className="card mt-3 overflow-x-auto">
          <table className="table">
            <thead><tr><th>Sorteo</th><th>Patrocinador</th><th>Estado</th><th>Cierre</th><th>Papeletas</th><th></th></tr></thead>
            <tbody>
              {all.map((r) => {
                const st = raffleState(r, now);
                return (
                  <tr key={r.id}>
                    <td><Link href={`/sorteo/${r.id}`} className="font-semibold hover:underline">{r.emoji} {r.title}</Link> <span className="text-xs text-violet-400">{TYPE_LABEL[r.type]}</span></td>
                    <td>{r.sponsor.companyName}</td>
                    <td><span className="badge bg-violet-100 text-violet-800">{STATE_LABEL[st]}</span></td>
                    <td className="whitespace-nowrap text-xs">{formatDateTime(r.endAt)}</td>
                    <td>{r.ticketCount}</td>
                    <td className="whitespace-nowrap">
                      <Link href={`/patrocinador/sorteo/${r.id}`} className="text-xs font-semibold text-violet-600 hover:underline">Stats</Link>
                      {st === "live" && (
                        <form action={forceDrawAction} className="ml-2 inline">
                          <input type="hidden" name="raffleId" value={r.id} />
                          <button className="text-xs font-semibold text-rose-600 hover:underline" title="Solo para pruebas">Cerrar y sortear ya</button>
                        </form>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
