import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { getSettings, type AppSettings, type RewardReason } from "./settings";
import { now as clockNow } from "./clock";
import { dayKey, previousDayKey } from "./time";
import { allocateTicketsTx, TX_OPTS, UserFacingError } from "./tickets";

type Tx = Prisma.TransactionClient;

async function lockUser(tx: Tx, userId: string) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${userId}))`;
}

export async function wildcardBalance(userId: string, tx: Tx | typeof prisma = prisma) {
  const agg = await tx.wildcardEntry.aggregate({ where: { userId }, _sum: { amount: true } });
  return agg._sum.amount ?? 0;
}

/** Comodines ganados hoy que cuentan para el tope diario */
export async function earnedToday(userId: string, today: string, tx: Tx | typeof prisma = prisma, settings?: AppSettings) {
  const s = settings ?? (await getSettings());
  const exempt = (Object.keys(s.rewards) as RewardReason[]).filter((r) => s.rewards[r].exemptFromDailyCap);
  const agg = await tx.wildcardEntry.aggregate({
    where: { userId, dayKey: today, amount: { gt: 0 }, reason: { notIn: [...exempt, "ADMIN"] } },
    _sum: { amount: true },
  });
  return agg._sum.amount ?? 0;
}

/**
 * Concede comodines respetando: una sola vez, límite de veces al día y tope diario total.
 * Devuelve la cantidad realmente concedida (0 si no procede).
 */
export async function grantWildcardsTx(tx: Tx, userId: string, reason: RewardReason, refId: string | null, now: Date, s: AppSettings): Promise<number> {
  const rule = s.rewards[reason];
  if (!rule || rule.amount <= 0) return 0;
  await lockUser(tx, userId);
  const today = dayKey(now);
  if (rule.once) {
    const exists = await tx.wildcardEntry.count({ where: { userId, reason } });
    if (exists) return 0;
  }
  if (rule.dailyLimit) {
    const timesToday = await tx.wildcardEntry.count({ where: { userId, reason, dayKey: today } });
    if (timesToday >= rule.dailyLimit) return 0;
  }
  let amount = rule.amount;
  if (!rule.exemptFromDailyCap) {
    const already = await earnedToday(userId, today, tx, s);
    amount = Math.min(amount, Math.max(0, s.dailyWildcardCap - already));
  }
  if (amount <= 0) return 0;
  await tx.wildcardEntry.create({ data: { userId, amount, reason, dayKey: today, refId } });
  return amount;
}

export async function grantWildcards(userId: string, reason: RewardReason, refId: string | null = null) {
  const [now, s] = await Promise.all([clockNow(), getSettings()]);
  return prisma.$transaction((tx) => grantWildcardsTx(tx, userId, reason, refId, now, s), TX_OPTS);
}

/** Gasta comodines en un sorteo. Devuelve los números de papeleta asignados. */
export async function spendWildcards(userId: string, raffleId: string, count: number) {
  if (!Number.isInteger(count) || count <= 0) throw new UserFacingError("Cantidad no válida");
  const [now, settings] = await Promise.all([clockNow(), getSettings()]);
  return prisma.$transaction(
    async (tx) => {
      await lockUser(tx, userId);
      const balance = await wildcardBalance(userId, tx);
      if (balance < count) throw new UserFacingError(`Solo tienes ${balance} comodines`);
      const unlocked = await tx.actionCompletion.count({
        where: { userId, completedAt: { not: null }, action: { raffleId, isUnlock: true } },
      });
      if (!unlocked) throw new UserFacingError("Primero desbloquea el sorteo");
      const numbers = await allocateTicketsTx(tx, { raffleId, userId, count, source: "WILDCARD", now, settings });
      if (numbers.length > 0) {
        await tx.wildcardEntry.create({
          data: { userId, amount: -numbers.length, reason: "SPEND", dayKey: dayKey(now), refId: raffleId },
        });
      }
      return numbers;
    },
    TX_OPTS,
  );
}

/**
 * Registro de entrada diaria: +comodines diarios y control de racha.
 * Idempotente por día.
 */
export async function registerDailyLogin(userId: string) {
  const [now, s] = await Promise.all([clockNow(), getSettings()]);
  const today = dayKey(now);
  return prisma.$transaction(async (tx) => {
    await lockUser(tx, userId);
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user || user.lastLoginDay === today || !user.phoneVerified) return null;
    const streak = user.lastLoginDay === previousDayKey(today) ? user.streak + 1 : 1;
    await tx.user.update({ where: { id: userId }, data: { lastLoginDay: today, streak } });
    const daily = await grantWildcardsTx(tx, userId, "DAILY_LOGIN", null, now, s);
    let streakBonus = 0;
    if (streak > 0 && streak % 7 === 0) streakBonus = await grantWildcardsTx(tx, userId, "STREAK_7", String(streak), now, s);
    return { daily, streakBonus, streak };
  }, TX_OPTS);
}
