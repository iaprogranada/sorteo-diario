"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { grantWildcards } from "@/lib/rewards";
import { now as clockNow } from "@/lib/clock";
import { dayKey } from "@/lib/time";
import { getSettings } from "@/lib/settings";
import type { FormState } from "@/components/ActionForm";

const profileSchema = z.object({
  name: z.string().trim().min(2, "Pon tu nombre"),
  province: z.string().min(2, "Elige tu provincia"),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pon tu fecha de nacimiento"),
});

export async function updateProfileAction(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const p = profileSchema.safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: p.error.issues[0].message };
  const birth = new Date(p.data.birthDate + "T12:00:00Z");
  const age = (Date.now() - birth.getTime()) / (365.25 * 86_400_000);
  if (age < 18) return { error: "Debes ser mayor de 18 años para participar" };
  await prisma.user.update({ where: { id: user.id }, data: { name: p.data.name, province: p.data.province, birthDate: birth, profileComplete: true } });
  let msg = "Perfil guardado";
  if (user.role === "USER" && user.phoneVerified) {
    const got = await grantWildcards(user.id, "PROFILE");
    if (got > 0) msg += ` · +${got} comodines por completar tu perfil 🃏`;
  }
  revalidatePath("/", "layout");
  return { ok: msg };
}

export async function claimPrizeAction(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const id = String(fd.get("deliveryId"));
  const d = await prisma.prizeDelivery.findUnique({ where: { id }, include: { raffle: true } });
  if (!d || d.userId !== user.id) return { error: "Premio no encontrado" };
  if (d.status !== "PENDING_CLAIM") return { error: "Este premio ya no está pendiente" };
  if (d.claimDeadline < (await clockNow())) return { error: "El plazo para reclamar ha caducado" };
  const address = String(fd.get("address") ?? "").trim();
  if (d.raffle.deliveryType === "SHIPPING" && address.length < 10) return { error: "Indica una dirección de envío completa" };
  await prisma.prizeDelivery.update({ where: { id }, data: { status: "CLAIMED", shippingAddress: address || null } });
  revalidatePath("/perfil");
  return { ok: "¡Premio aceptado! El patrocinador se pondrá en contacto contigo." };
}

export async function markNotificationsReadAction() {
  const user = await requireUser();
  await prisma.notification.updateMany({ where: { userId: user.id, read: false }, data: { read: true } });
  revalidatePath("/", "layout");
}

/** Vídeo de anunciante (tarea "ver anuncio" para ganar comodines) */
export async function startAdViewAction(bannerId: string) {
  const user = await requireUser(["USER"]);
  const now = await clockNow();
  const v = await prisma.adView.create({ data: { bannerId, userId: user.id, dayKey: dayKey(now) } });
  return v.id;
}

export async function completeAdViewAction(viewId: string): Promise<{ ok: boolean; message: string }> {
  const user = await requireUser(["USER"]);
  const v = await prisma.adView.findUnique({ where: { id: viewId } });
  if (!v || v.userId !== user.id || v.completedAt) return { ok: false, message: "Vídeo no válido" };
  const banner = await prisma.adBanner.findUnique({ where: { id: v.bannerId } });
  const elapsed = (Date.now() - v.startedAt.getTime()) / 1000;
  if (!banner || elapsed + 1 < banner.videoSeconds) return { ok: false, message: "Mira el vídeo completo" };
  await prisma.adView.update({ where: { id: viewId }, data: { completedAt: new Date() } });
  if (!user.phoneVerified) return { ok: false, message: "Verifica tu teléfono para ganar comodines" };
  const got = await grantWildcards(user.id, "AD_VIDEO", banner.id);
  revalidatePath("/", "layout");
  revalidatePath("/ganar");
  const s = await getSettings();
  return { ok: got > 0, message: got > 0 ? `+${got} comodín 🃏` : `Hoy ya has llegado al máximo (${s.rewards.AD_VIDEO.dailyLimit} vídeos o tope diario de ${s.dailyWildcardCap})` };
}
