import Link from "next/link";
import { prisma } from "@/lib/db";
import { tickSafe } from "@/lib/engine";
import { formatDate } from "@/lib/time";
import { euros, maskName } from "@/lib/format";

export default async function WinnersPage() {
  await tickSafe();
  const draws = await prisma.draw.findMany({
    include: { raffle: { include: { sponsor: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const users = await prisma.user.findMany({
    where: { id: { in: draws.map((d) => d.winnerUserIds[0]).filter(Boolean) } },
    select: { id: true, name: true, province: true },
  });
  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="h1">🏆 Ganadores</h1>
      <p className="mt-1 text-violet-700">Todos los sorteos son verificables: pulsa en “Verificar” para comprobar el resultado tú mismo.</p>
      <div className="card mt-6 overflow-x-auto">
        <table className="table">
          <thead>
            <tr><th>Sorteo</th><th>Ganador</th><th>Papeleta</th><th>Fecha</th><th></th></tr>
          </thead>
          <tbody>
            {draws.map((d) => {
              const u = users.find((x) => x.id === d.winnerUserIds[0]);
              return (
                <tr key={d.id}>
                  <td>
                    <Link href={`/sorteo/${d.raffleId}`} className="font-semibold text-violet-950 hover:underline">{d.raffle.emoji} {d.raffle.title}</Link>
                    <p className="text-xs text-violet-500">{d.raffle.sponsor.companyName} · {euros(d.raffle.prizeValue.toString())}</p>
                  </td>
                  <td>{d.winnerNumbers.length ? `${maskName(u?.name)}${u?.province ? ` (${u.province})` : ""}` : "Sin participantes"}</td>
                  <td className="font-mono font-bold">{d.winnerNumbers[0] ? `#${d.winnerNumbers[0]}` : "—"} <span className="text-xs font-normal text-violet-400">de {d.totalTickets}</span></td>
                  <td className="whitespace-nowrap text-violet-500">{formatDate(d.createdAt)}</td>
                  <td><Link href={`/verificar/${d.raffleId}`} className="font-semibold text-violet-600 hover:underline">Verificar</Link></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {draws.length === 0 && <p className="p-6 text-center text-sm text-violet-500">Aún no hay sorteos finalizados.</p>}
      </div>
    </main>
  );
}
