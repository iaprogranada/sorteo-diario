import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { getSettings, maxTicketsFor, type AppSettings } from "./settings";
import { now as clockNow } from "./clock";

/** Las transacciones esperan turno (bloqueo de fila) en momentos de mucho tráfico */
export const TX_OPTS = { maxWait: 20000, timeout: 20000 };

export class UserFacingError extends Error {}

type Tx = Prisma.TransactionClient;

/**
 * Asigna hasta `count` papeletas a un usuario dentro de una transacción.
 * Bloquea la fila del sorteo (FOR UPDATE) para que la numeración sea
 * correlativa y sin huecos aunque lleguen muchas peticiones a la vez.
 * Devuelve los números asignados (puede ser menos de `count` por los topes).
 */
export async function allocateTicketsTx(
  tx: Tx,
  opts: { raffleId: string; userId: string; count: number; source: "UNLOCK" | "ACTION" | "WILDCARD"; now: Date; settings: AppSettings },
): Promise<number[]> {
  const { raffleId, userId, count, source, now, settings } = opts;
  if (count <= 0) return [];
  const rows = await tx.$queryRaw<
    { id: string; status: string; type: "REGULAR" | "SPECIAL" | "PREMIUM"; startAt: Date; endAt: Date; ticketCount: number; maxTotalTickets: number | null }[]
  >`SELECT id, status, type, "startAt", "endAt", "ticketCount", "maxTotalTickets" FROM "Raffle" WHERE id = ${raffleId} FOR UPDATE`;
  const r = rows[0];
  if (!r) throw new UserFacingError("Sorteo no encontrado");
  if (r.status !== "APPROVED" || r.startAt > now || r.endAt <= now) throw new UserFacingError("Este sorteo no está abierto");
  if (r.maxTotalTickets && r.ticketCount >= r.maxTotalTickets) throw new UserFacingError("Se han agotado las papeletas");

  const cap = maxTicketsFor(r.type, settings);
  let allowed = count;
  if (cap > 0) {
    const have = await tx.ticket.count({ where: { raffleId, userId } });
    allowed = Math.min(allowed, cap - have);
  }
  if (r.maxTotalTickets) allowed = Math.min(allowed, r.maxTotalTickets - r.ticketCount);
  if (allowed <= 0) return [];

  const numbers = Array.from({ length: allowed }, (_, i) => r.ticketCount + 1 + i);
  await tx.ticket.createMany({ data: numbers.map((number) => ({ raffleId, userId, number, source })) });
  const newCount = r.ticketCount + allowed;
  const soldOut = !!r.maxTotalTickets && newCount >= r.maxTotalTickets;
  // Si se agotan, el sorteo cierra ahora (endAt = ahora) para fijar la ronda de drand
  await tx.raffle.update({ where: { id: raffleId }, data: { ticketCount: newCount, ...(soldOut ? { endAt: now } : {}) } });
  return numbers;
}

export async function allocateTickets(opts: { raffleId: string; userId: string; count: number; source: "UNLOCK" | "ACTION" | "WILDCARD" }) {
  const [now, settings] = await Promise.all([clockNow(), getSettings()]);
  return prisma.$transaction((tx) => allocateTicketsTx(tx, { ...opts, now, settings }), TX_OPTS);
}

export async function userTicketInfo(raffleId: string, userId: string) {
  const tickets = await prisma.ticket.findMany({ where: { raffleId, userId }, orderBy: { number: "asc" }, select: { number: true } });
  return tickets.map((t) => t.number);
}
