import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/time";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { expireDeliveryAction } from "@/app/actions/admin";
import { markDeliveredAction } from "@/app/actions/sponsor";

const ST = { PENDING_CLAIM: "Esperando aceptación", CLAIMED: "Pendiente de entrega", DELIVERED: "Entregado", EXPIRED: "Caducado" };

export default async function AdminDeliveries() {
  const list = await prisma.prizeDelivery.findMany({
    include: { user: true, raffle: { include: { sponsor: true, draw: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return (
    <div>
      <h1 className="h1">Premios y entregas</h1>
      <div className="card mt-4 overflow-x-auto">
        <table className="table">
          <thead><tr><th>Sorteo</th><th>Ganador</th><th>Estado</th><th>Plazo</th><th></th></tr></thead>
          <tbody>
            {list.map((d) => (
              <tr key={d.id}>
                <td><Link href={`/patrocinador/sorteo/${d.raffleId}`} className="font-semibold hover:underline">{d.raffle.emoji} {d.raffle.title}</Link><p className="text-xs text-violet-500">{d.raffle.sponsor.companyName}</p></td>
                <td>{d.rank === 0 ? "🏆" : `Suplente ${d.rank}`} #{d.raffle.draw?.winnerNumbers[d.rank]} · {d.user.name}<p className="text-xs text-violet-500">{d.user.email}</p></td>
                <td><span className="badge bg-violet-100 text-violet-800">{ST[d.status]}</span></td>
                <td className="text-xs">{formatDateTime(d.claimDeadline)}</td>
                <td className="whitespace-nowrap">
                  {d.status === "PENDING_CLAIM" && (
                    <form action={expireDeliveryAction}>
                      <input type="hidden" name="id" value={d.id} />
                      <button className="text-xs font-semibold text-rose-600 hover:underline">Caducar y pasar a suplente</button>
                    </form>
                  )}
                  {d.status === "CLAIMED" && (
                    <ActionForm action={markDeliveredAction}>
                      <input type="hidden" name="deliveryId" value={d.id} />
                      <SubmitButton className="btn-ghost py-1">Marcar entregado</SubmitButton>
                    </ActionForm>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.length === 0 && <p className="p-6 text-center text-sm text-violet-500">Aún no hay premios.</p>}
      </div>
    </div>
  );
}
