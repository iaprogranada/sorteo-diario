import { prisma } from "./db";
import { now as clockNow } from "./clock";
import { getRandomness } from "./drand";
import { pickWinners } from "./draw";
import { getSettings } from "./settings";
import { notify } from "./notify";

/**
 * Tareas programadas de la plataforma (se llaman desde el cron y al cargar páginas):
 *  - Cerrar sorteos vencidos y elegir ganador + suplentes.
 *  - Caducar premios no reclamados y pasar al siguiente suplente.
 */
export async function tick() {
  const now = await clockNow();
  const closed = await closeDueRaffles(now);
  const expired = await expireClaims(now);
  return { closed, expired, now };
}

let running: Promise<unknown> | null = null;
/** Versión ligera para llamar en cada carga de página sin solaparse */
export async function tickSafe() {
  if (running) return;
  running = tick()
    .catch((e) => console.error("[tick]", e))
    .finally(() => (running = null));
  await running;
}

export async function closeDueRaffles(now: Date) {
  const due = await prisma.raffle.findMany({
    where: { status: "APPROVED", endAt: { lte: now } },
    select: { id: true },
  });
  let count = 0;
  for (const { id } of due) {
    if (await drawRaffle(id)) count++;
  }
  return count;
}

export async function drawRaffle(raffleId: string): Promise<boolean> {
  const raffle = await prisma.raffle.findUnique({ where: { id: raffleId }, include: { sponsor: true } });
  if (!raffle || raffle.status !== "APPROVED") return false;
  const rnd = await getRandomness(raffle.endAt, raffle.id);
  if (!rnd) return false; // la ronda de drand aún no existe: se reintenta luego

  const tickets = await prisma.ticket.findMany({ where: { raffleId }, select: { number: true, userId: true } });
  const owner = new Map(tickets.map((t) => [t.number, t.userId]));
  const total = raffle.ticketCount;
  const picks = pickWinners(raffle.secretSeed, rnd.randomness, total, (n) => owner.get(n)!);
  const settings = await getSettings();
  const now = await clockNow();

  const ok = await prisma.$transaction(async (tx) => {
    const upd = await tx.raffle.updateMany({ where: { id: raffleId, status: "APPROVED" }, data: { status: "CLOSED" } });
    if (upd.count === 0) return false;
    await tx.draw.create({
      data: {
        raffleId,
        totalTickets: total,
        drandRound: rnd.round,
        drandRandomness: rnd.randomness,
        randomnessSource: rnd.source,
        winnerNumbers: picks.map((p) => p.number),
        winnerUserIds: picks.map((p) => p.userId),
        counters: picks.map((p) => p.counter),
      },
    });
    if (picks[0]) {
      await tx.prizeDelivery.create({
        data: {
          raffleId,
          userId: picks[0].userId,
          rank: 0,
          claimDeadline: new Date(now.getTime() + settings.claimDays * 86_400_000),
        },
      });
    }
    return true;
  });
  if (!ok) return false;

  if (picks[0]) {
    await notify(
      picks[0].userId,
      "🎉 ¡Has ganado un sorteo!",
      `Tu papeleta #${picks[0].number} ha ganado "${raffle.title}". Tienes ${settings.claimDays} días para aceptar el premio.`,
      "/perfil#premios",
    );
  }
  await notify(
    raffle.sponsor.userId,
    "Tu sorteo ha terminado",
    picks[0] ? `"${raffle.title}" ya tiene ganador (papeleta #${picks[0].number}).` : `"${raffle.title}" cerró sin participantes.`,
    `/patrocinador/sorteo/${raffle.id}`,
  );
  return true;
}

export async function expireClaims(now: Date) {
  const expired = await prisma.prizeDelivery.findMany({
    where: { status: "PENDING_CLAIM", claimDeadline: { lt: now } },
    include: { raffle: { include: { draw: true } } },
  });
  const settings = await getSettings();
  for (const d of expired) {
    await prisma.prizeDelivery.update({ where: { id: d.id }, data: { status: "EXPIRED" } });
    await promoteNext(d.raffleId, d.rank + 1, settings.claimDays, now);
  }
  return expired.length;
}

/** Pasa el premio al siguiente suplente (si existe) */
export async function promoteNext(raffleId: string, rank: number, claimDays: number, now: Date) {
  const raffle = await prisma.raffle.findUnique({ where: { id: raffleId }, include: { draw: true } });
  const nextUser = raffle?.draw?.winnerUserIds[rank];
  if (!raffle || !nextUser) return false;
  const exists = await prisma.prizeDelivery.findFirst({ where: { raffleId, rank } });
  if (exists) return false;
  await prisma.prizeDelivery.create({
    data: { raffleId, userId: nextUser, rank, claimDeadline: new Date(now.getTime() + claimDays * 86_400_000) },
  });
  await notify(
    nextUser,
    "🎉 ¡Te ha tocado como suplente!",
    `El ganador de "${raffle.title}" no reclamó el premio y ahora es tuyo (papeleta #${raffle.draw!.winnerNumbers[rank]}).`,
    "/perfil#premios",
  );
  return true;
}
