"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { getSettings, saveSettings, type AppSettings, type RewardReason } from "@/lib/settings";
import { getClockOffsetMs, setClockOffsetMs, testClockEnabled, now as clockNow } from "@/lib/clock";
import { tick, drawRaffle, promoteNext } from "@/lib/engine";
import { notify } from "@/lib/notify";
import { dayKey } from "@/lib/time";
import type { FormState } from "@/components/ActionForm";

export async function approveRaffleAction(fd: FormData) {
  await requireAdmin();
  const id = String(fd.get("raffleId"));
  const r = await prisma.raffle.update({ where: { id }, data: { status: "APPROVED", rejectReason: null }, include: { sponsor: true } });
  await notify(r.sponsor.userId, "✅ Sorteo aprobado", `"${r.title}" se publicará en la fecha programada.`, `/patrocinador/sorteo/${id}`);
  revalidatePath("/admin/sorteos");
}

export async function rejectRaffleAction(fd: FormData) {
  await requireAdmin();
  const id = String(fd.get("raffleId"));
  const reason = String(fd.get("reason") ?? "").trim() || "No cumple las condiciones";
  const r = await prisma.raffle.update({ where: { id }, data: { status: "REJECTED", rejectReason: reason }, include: { sponsor: true } });
  await notify(r.sponsor.userId, "Sorteo no aprobado", `"${r.title}": ${reason}`, `/patrocinador/sorteo/${id}`);
  revalidatePath("/admin/sorteos");
}

/** Pruebas: cierra un sorteo ya y lo sortea */
export async function forceDrawAction(fd: FormData) {
  await requireAdmin();
  const id = String(fd.get("raffleId"));
  const now = await clockNow();
  await prisma.raffle.updateMany({ where: { id, status: "APPROVED" }, data: { endAt: now } });
  await drawRaffle(id);
  revalidatePath("/admin/sorteos");
}

export async function runTickAction(): Promise<FormState> {
  await requireAdmin();
  const r = await tick();
  revalidatePath("/", "layout");
  return { ok: `Tareas ejecutadas: ${r.closed} sorteos cerrados, ${r.expired} premios caducados.` };
}

export async function advanceClockAction(_: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  if (!testClockEnabled()) return { error: "El reloj de pruebas está desactivado" };
  const hours = Number(fd.get("hours"));
  if (hours === 0) await setClockOffsetMs(0);
  else await setClockOffsetMs((await getClockOffsetMs()) + hours * 3_600_000);
  const r = await tick();
  revalidatePath("/", "layout");
  return { ok: `${hours === 0 ? "Reloj restablecido" : `Reloj adelantado ${hours} h`}. ${r.closed} sorteos cerrados, ${r.expired} premios caducados.` };
}

const int = z.coerce.number().int().min(0);

export async function saveSettingsAction(_: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const cur = await getSettings();
  try {
    const next: AppSettings = {
      ...cur,
      maxTicketsRegular: int.parse(fd.get("maxTicketsRegular")),
      maxTicketsSpecial: int.parse(fd.get("maxTicketsSpecial")),
      maxTicketsPremium: int.parse(fd.get("maxTicketsPremium")),
      unlockTickets: int.parse(fd.get("unlockTickets")),
      extraActionTickets: int.parse(fd.get("extraActionTickets")),
      maxExtraActions: int.parse(fd.get("maxExtraActions")),
      dailyWildcardCap: int.parse(fd.get("dailyWildcardCap")),
      maxPrizeValue: z.coerce.number().positive().parse(fd.get("maxPrizeValue")),
      specialMaxHours: int.parse(fd.get("specialMaxDays")) * 24,
      claimDays: int.parse(fd.get("claimDays")),
      regularDurations: String(fd.get("regularDurations"))
        .split(",")
        .map((x) => parseInt(x.trim(), 10))
        .filter((x) => x > 0),
      rewards: { ...cur.rewards },
    };
    for (const k of Object.keys(cur.rewards) as RewardReason[]) {
      next.rewards[k] = {
        ...cur.rewards[k],
        amount: int.parse(fd.get(`r_${k}_amount`)),
        ...(cur.rewards[k].dailyLimit !== undefined ? { dailyLimit: int.parse(fd.get(`r_${k}_limit`)) } : {}),
      };
    }
    await saveSettings(next);
  } catch {
    return { error: "Revisa los valores: deben ser números válidos" };
  }
  revalidatePath("/", "layout");
  return { ok: "Ajustes guardados" };
}

const bannerSchema = z.object({
  advertiser: z.string().trim().min(2),
  title: z.string().trim().min(3),
  text: z.string().trim().optional(),
  emoji: z.string().trim().min(1).max(8),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  linkUrl: z.string().url(),
  imageUrl: z.string().url().optional().or(z.literal("")),
  videoUrl: z.string().url().optional().or(z.literal("")),
  videoSeconds: z.coerce.number().int().min(5).max(60),
  position: z.enum(["LEFT", "RIGHT", "FOOTER"]),
});

export async function createBannerAction(_: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const p = bannerSchema.safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: `Revisa el campo: ${p.error.issues[0].path.join(".")}` };
  await prisma.adBanner.create({ data: { ...p.data, imageUrl: p.data.imageUrl || null, videoUrl: p.data.videoUrl || null } });
  revalidatePath("/admin/banners");
  return { ok: "Banner creado" };
}

export async function toggleBannerAction(fd: FormData) {
  await requireAdmin();
  const id = String(fd.get("id"));
  const b = await prisma.adBanner.findUnique({ where: { id } });
  if (b) await prisma.adBanner.update({ where: { id }, data: { active: !b.active } });
  revalidatePath("/admin/banners");
}

export async function deleteBannerAction(fd: FormData) {
  await requireAdmin();
  await prisma.adBanner.delete({ where: { id: String(fd.get("id")) } });
  revalidatePath("/admin/banners");
}

export async function expireDeliveryAction(fd: FormData) {
  await requireAdmin();
  const id = String(fd.get("id"));
  const d = await prisma.prizeDelivery.findUnique({ where: { id } });
  if (!d || d.status !== "PENDING_CLAIM") return;
  await prisma.prizeDelivery.update({ where: { id }, data: { status: "EXPIRED" } });
  const s = await getSettings();
  await promoteNext(d.raffleId, d.rank + 1, s.claimDays, await clockNow());
  revalidatePath("/admin/entregas");
}

export async function toggleBanAction(fd: FormData) {
  await requireAdmin();
  const id = String(fd.get("userId"));
  const u = await prisma.user.findUnique({ where: { id } });
  if (!u || u.role === "ADMIN") return;
  await prisma.user.update({ where: { id }, data: { banned: !u.banned } });
  if (!u.banned) await prisma.session.deleteMany({ where: { userId: id } });
  revalidatePath("/admin/fraude");
  revalidatePath("/admin/usuarios");
}

export async function adjustWildcardsAction(_: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const userId = String(fd.get("userId"));
  const amount = parseInt(String(fd.get("amount")), 10);
  if (!amount) return { error: "Cantidad no válida" };
  await prisma.wildcardEntry.create({ data: { userId, amount, reason: "ADMIN", dayKey: dayKey(await clockNow()) } });
  revalidatePath("/admin/usuarios");
  return { ok: `${amount > 0 ? "+" : ""}${amount} comodines aplicados` };
}
