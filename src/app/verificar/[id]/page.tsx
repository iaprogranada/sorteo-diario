import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { tickSafe } from "@/lib/engine";
import { maskName } from "@/lib/format";
import { formatDateTime } from "@/lib/time";
import { DRAND_URL } from "@/lib/drand";
import { Verifier } from "@/components/Verifier";

export default async function VerifyPage({ params }: { params: Promise<{ id: string }> }) {
  await tickSafe();
  const { id } = await params;
  const raffle = await prisma.raffle.findUnique({ where: { id }, include: { draw: true, sponsor: true } });
  if (!raffle || raffle.status === "PENDING" || raffle.status === "REJECTED") notFound();
  const draw = raffle.draw;
  const users = draw ? await prisma.user.findMany({ where: { id: { in: draw.winnerUserIds } }, select: { id: true, name: true } }) : [];

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <Link href={`/sorteo/${raffle.id}`} className="text-sm font-medium text-violet-600 hover:underline">← {raffle.title}</Link>
      <h1 className="h1">🔐 Verificar sorteo</h1>

      <section className="card space-y-2 p-5 text-sm text-violet-800">
        <h2 className="h2">Cómo funciona</h2>
        <ol className="list-decimal space-y-1 pl-5">
          <li>Al crear el sorteo generamos una <b>clave secreta</b> y publicamos su huella SHA-256. Así no podemos cambiarla después.</li>
          <li>Cada papeleta recibe un número correlativo: #1, #2, #3… hasta el total.</li>
          <li>Al cerrar, tomamos la <b>primera ronda de drand</b> (un número aleatorio público generado por una red independiente) emitida después de la hora de cierre. Nadie la conoce antes.</li>
          <li>Papeleta ganadora = HMAC-SHA256(clave, “aleatoriedad:contador”) módulo total de papeletas + 1. Contador 0 es el ganador; los siguientes, los suplentes (personas distintas).</li>
        </ol>
      </section>

      <section className="card space-y-2 p-5 text-sm">
        <p><b>Huella publicada:</b> <code className="break-all text-xs">{raffle.seedHash}</code></p>
        <p><b>Cierre:</b> {formatDateTime(raffle.endAt)}</p>
        {!draw ? (
          <p className="rounded-lg bg-violet-50 p-3 text-violet-700">El sorteo aún no se ha realizado. La clave secreta se revelará al cerrar.</p>
        ) : (
          <>
            <p><b>Clave secreta revelada:</b> <code className="break-all text-xs">{raffle.secretSeed}</code></p>
            <p>
              <b>Ronda drand:</b> {draw.drandRound}{" "}
              {draw.randomnessSource === "drand" ? (
                <a href={`${DRAND_URL}/${draw.drandRound}`} target="_blank" rel="noopener" className="text-violet-600 underline">comprobar en drand ↗</a>
              ) : (
                <span className="badge bg-amber-100 text-amber-900">simulada (entorno de pruebas)</span>
              )}
            </p>
            <p><b>Aleatoriedad:</b> <code className="break-all text-xs">{draw.drandRandomness}</code></p>
            <p><b>Total de papeletas:</b> {draw.totalTickets}</p>
            {draw.winnerNumbers.length > 0 && (
              <ul className="mt-2 space-y-1">
                {draw.winnerNumbers.map((n, i) => (
                  <li key={i}>
                    {i === 0 ? "🏆 Ganador" : `🥈 Suplente ${i}`}: papeleta <b>#{n}</b> · {maskName(users.find((u) => u.id === draw.winnerUserIds[i])?.name)}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </section>

      {draw && draw.totalTickets > 0 && (
        <section className="card p-5">
          <h2 className="h2">Compruébalo tú mismo</h2>
          <p className="mb-3 text-sm text-violet-600">El cálculo se hace en tu navegador, sin pasar por nuestro servidor.</p>
          <Verifier seed={raffle.secretSeed} seedHash={raffle.seedHash} randomness={draw.drandRandomness ?? ""} total={draw.totalTickets} counters={draw.counters} numbers={draw.winnerNumbers} />
        </section>
      )}
    </main>
  );
}
