"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { now as clockNow } from "@/lib/clock";
import { getSettings } from "@/lib/settings";
import { allocateTicketsTx, TX_OPTS, UserFacingError } from "@/lib/tickets";
import { grantWildcards, spendWildcards } from "@/lib/rewards";
import type { FormState } from "@/components/ActionForm";

export type ActionResult = { ok: boolean; message: string; tickets?: number[]; coupon?: string };

async function participant() {
  const user = await getCurrentUser();
  if (!user) throw new UserFacingError("Inicia sesión para participar");
  if (user.role !== "USER") throw new UserFacingError("Las cuentas de patrocinador o admin no pueden participar");
  if (!user.phoneVerified) throw new UserFacingError("Verifica tu teléfono para participar");
  return user;
}

function fail(e: unknown): ActionResult {
  if (e instanceof UserFacingError) return { ok: false, message: e.message };
  console.error(e);
  return { ok: false, message: "Ha ocurrido un error. Inténtalo de nuevo." };
}

/** Marca el inicio de una acción (para medir el tiempo de vídeo o visita) */
export async function startActionAction(actionId: string): Promise<ActionResult> {
  try {
    const user = await participant();
    const action = await prisma.raffleAction.findUnique({ where: { id: actionId } });
    if (!action) throw new UserFacingError("Acción no encontrada");
    if (!action.isUnlock) {
      const unlocked = await prisma.actionCompletion.count({
        where: { userId: user.id, completedAt: { not: null }, action: { raffleId: action.raffleId, isUnlock: true } },
      });
      if (!unlocked) throw new UserFacingError("Primero desbloquea el sorteo");
    }
    await prisma.actionCompletion.upsert({
      where: { actionId_userId: { actionId, userId: user.id } },
      create: { actionId, userId: user.id },
      update: {},
    });
    return { ok: true, message: "" };
  } catch (e) {
    return fail(e);
  }
}

/** Completa una acción del patrocinador y concede papeletas */
export async function completeActionAction(actionId: string, form?: Record<string, string>): Promise<ActionResult> {
  try {
    const user = await participant();
    const action = await prisma.raffleAction.findUnique({ where: { id: actionId } });
    if (!action) throw new UserFacingError("Acción no encontrada");
    const completion = await prisma.actionCompletion.findUnique({ where: { actionId_userId: { actionId, userId: user.id } } });
    if (!completion) throw new UserFacingError("Primero inicia la acción");
    if (completion.completedAt) throw new UserFacingError("Ya completaste esta acción");

    // Tiempo mínimo real (no se puede saltar el vídeo o la visita)
    const elapsed = (Date.now() - completion.startedAt.getTime()) / 1000;
    const minSeconds = action.type === "VIDEO" ? action.seconds : action.type === "VISIT" ? Math.max(action.seconds, 3) : action.type === "FOLLOW" ? 2 : 0;
    if (elapsed + 1 < minSeconds) throw new UserFacingError(`Aún faltan ${Math.ceil(minSeconds - elapsed)} segundos`);

    let leadData: { name: string; email: string; phone?: string; answer?: string } | null = null;
    if (action.type === "FORM") {
      const name = form?.name?.trim();
      const email = form?.email?.trim();
      if (!name || !email || !/^\S+@\S+\.\S+$/.test(email)) throw new UserFacingError("Rellena nombre y email válidos");
      if (form?.consent !== "true") throw new UserFacingError("Debes aceptar la cesión de datos al patrocinador");
      leadData = { name, email, phone: form?.phone?.trim() || undefined, answer: form?.answer?.trim() || undefined };
    }

    const settings = await getSettings();
    const now = await clockNow();
    const count = action.isUnlock ? settings.unlockTickets : settings.extraActionTickets;
    const tickets = await prisma.$transaction(
      async (tx) => {
        const upd = await tx.actionCompletion.updateMany({ where: { id: completion.id, completedAt: null }, data: { completedAt: new Date() } });
        if (upd.count === 0) throw new UserFacingError("Ya completaste esta acción");
        if (leadData) await tx.lead.create({ data: { actionId, userId: user.id, consent: true, ...leadData } });
        return allocateTicketsTx(tx, { raffleId: action.raffleId, userId: user.id, count, source: action.isUnlock ? "UNLOCK" : "ACTION", now, settings });
      },
      TX_OPTS,
    );
    revalidatePath(`/sorteo/${action.raffleId}`);
    const message =
      tickets.length > 0
        ? `¡Conseguido! +${tickets.length} papeleta${tickets.length > 1 ? "s" : ""}: ${tickets.map((n) => `#${n}`).join(", ")}`
        : "Acción completada. Ya tienes el máximo de papeletas en este sorteo.";
    return { ok: true, message, tickets, coupon: action.type === "COUPON" ? action.couponCode ?? undefined : undefined };
  } catch (e) {
    return fail(e);
  }
}

export async function spendWildcardsAction(_: FormState, fd: FormData): Promise<FormState> {
  try {
    const user = await participant();
    const raffleId = String(fd.get("raffleId"));
    const count = Number(fd.get("count"));
    const numbers = await spendWildcards(user.id, raffleId, count);
    revalidatePath(`/sorteo/${raffleId}`);
    revalidatePath("/", "layout");
    if (numbers.length === 0) return { error: "Ya tienes el máximo de papeletas en este sorteo" };
    return { ok: `+${numbers.length} papeletas: ${numbers.map((n) => `#${n}`).join(", ")}` };
  } catch (e) {
    const r = fail(e);
    return { error: r.message };
  }
}

export async function shareRaffleAction(raffleId: string): Promise<ActionResult> {
  try {
    const user = await participant();
    const got = await grantWildcards(user.id, "SHARE", raffleId);
    revalidatePath("/", "layout");
    return { ok: true, message: got > 0 ? `Enlace copiado. +${got} comodín por compartir 🃏` : "Enlace copiado. (Hoy ya has conseguido el máximo por compartir)" };
  } catch (e) {
    return fail(e);
  }
}
