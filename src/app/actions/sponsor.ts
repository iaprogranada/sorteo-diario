"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { generateSeed } from "@/lib/draw";
import { fromLocalInput } from "@/lib/time";
import { now as clockNow } from "@/lib/clock";
import { notify } from "@/lib/notify";
import type { FormState } from "@/components/ActionForm";

const actionSchema = z.object({
  type: z.enum(["VIDEO", "VISIT", "FOLLOW", "FORM", "COUPON"]),
  label: z.string().trim().min(3, "Cada acción necesita un texto"),
  url: z.string().trim().optional().default(""),
  seconds: z.coerce.number().int().min(0).max(120).default(0),
  couponCode: z.string().trim().optional().default(""),
  formQuestion: z.string().trim().optional().default(""),
});
type ActionInput = z.infer<typeof actionSchema>;

const raffleSchema = z.object({
  title: z.string().trim().min(5, "El título es muy corto").max(90),
  description: z.string().trim().min(10, "Describe el premio").max(2000),
  category: z.string().min(2),
  emoji: z.string().trim().min(1).max(8).default("🎁"),
  imageUrl: z.string().trim().optional().default(""),
  prizeValue: z.coerce.number().positive("Indica el valor del premio"),
  type: z.enum(["REGULAR", "SPECIAL", "PREMIUM"]),
  durationHours: z.coerce.number().int().min(1),
  startAt: z.string().min(10, "Elige fecha de inicio"),
  deliveryType: z.enum(["DIGITAL", "SHIPPING", "IN_PERSON"]),
  city: z.string().trim().optional().default(""),
  maxTotalTickets: z.string().optional().default(""),
  actions: z.string(),
});

function validateAction(a: ActionInput): string | null {
  const needsUrl = a.type === "VIDEO" || a.type === "VISIT" || a.type === "FOLLOW";
  if (needsUrl && !/^https?:\/\/\S+$/.test(a.url)) return `La acción "${a.label}" necesita un enlace válido (https://…)`;
  if (a.type === "VIDEO" && (a.seconds < 5 || a.seconds > 60)) return "Los vídeos deben durar entre 5 y 60 segundos";
  if (a.type === "COUPON" && !a.couponCode) return "La acción de cupón necesita un código";
  return null;
}

export async function createRaffleAction(_: FormState, fd: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user?.sponsor) return { error: "Necesitas una cuenta de patrocinador" };
  const p = raffleSchema.safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: p.error.issues[0].message };
  const d = p.data;
  const s = await getSettings();
  const isAdmin = user.role === "ADMIN";

  if (d.type === "PREMIUM" && !isAdmin) return { error: "Los sorteos premium solo los crea el administrador" };
  if (d.type !== "PREMIUM" && d.prizeValue >= s.maxPrizeValue) return { error: `Por ahora el valor del premio debe ser inferior a ${s.maxPrizeValue} €` };
  if (d.type === "REGULAR" && !s.regularDurations.includes(d.durationHours)) return { error: `Duración no válida (${s.regularDurations.join(", ")} h)` };
  if (d.type === "SPECIAL" && d.durationHours > s.specialMaxHours) return { error: `Un sorteo especial dura como máximo ${s.specialMaxHours / 24} días` };
  if (d.deliveryType === "IN_PERSON" && !d.city) return { error: "Indica la ciudad donde se disfruta el premio" };
  if (d.imageUrl && !/^https?:\/\/\S+$/.test(d.imageUrl)) return { error: "La URL de la imagen no es válida" };

  const startAt = fromLocalInput(d.startAt);
  if (!startAt) return { error: "Fecha de inicio no válida" };
  const now = await clockNow();
  if (startAt.getTime() < now.getTime() - 5 * 60_000) return { error: "La fecha de inicio no puede estar en el pasado" };
  const endAt = new Date(startAt.getTime() + d.durationHours * 3_600_000);

  let rawActions: unknown;
  try {
    rawActions = JSON.parse(d.actions);
  } catch {
    return { error: "Acciones no válidas" };
  }
  const acts = z.array(actionSchema).min(1, "Añade la acción para desbloquear").safeParse(rawActions);
  if (!acts.success) return { error: acts.error.issues[0].message };
  if (acts.data.length - 1 > s.maxExtraActions) return { error: `Máximo ${s.maxExtraActions} acciones extra` };
  for (const a of acts.data) {
    const err = validateAction(a);
    if (err) return { error: err };
  }
  const maxTotal = d.maxTotalTickets ? parseInt(d.maxTotalTickets, 10) : null;
  if (maxTotal !== null && (isNaN(maxTotal) || maxTotal < 10)) return { error: "El tope de papeletas totales debe ser al menos 10" };

  const { secretSeed, seedHash } = generateSeed();
  const raffle = await prisma.raffle.create({
    data: {
      sponsorId: user.sponsor.id,
      title: d.title,
      description: d.description,
      category: d.category,
      emoji: d.emoji,
      imageUrl: d.imageUrl || null,
      prizeValue: d.prizeValue,
      type: d.type,
      status: isAdmin ? "APPROVED" : "PENDING",
      deliveryType: d.deliveryType,
      city: d.city || null,
      startAt,
      endAt,
      maxTotalTickets: maxTotal,
      secretSeed,
      seedHash,
      actions: {
        create: acts.data.map((a, i) => ({
          isUnlock: i === 0,
          order: i,
          type: a.type,
          label: a.label,
          url: a.url || null,
          seconds: a.type === "VISIT" ? Math.max(a.seconds, 3) : a.seconds,
          couponCode: a.couponCode || null,
          formQuestion: a.formQuestion || null,
        })),
      },
    },
  });
  if (!isAdmin) {
    const admins = await prisma.user.findMany({ where: { role: "ADMIN" } });
    for (const a of admins) await notify(a.id, "Nuevo sorteo para revisar", `${user.sponsor.companyName}: "${raffle.title}"`, "/admin/sorteos");
  }
  revalidatePath("/patrocinador");
  redirect(`/patrocinador/sorteo/${raffle.id}?creado=1`);
}

export async function cancelRaffleAction(fd: FormData) {
  const user = await getCurrentUser();
  const id = String(fd.get("raffleId"));
  const r = await prisma.raffle.findUnique({ where: { id } });
  if (!user || !r || (user.sponsor?.id !== r.sponsorId && user.role !== "ADMIN")) return;
  if (r.status !== "PENDING" && !(r.status === "APPROVED" && r.startAt > (await clockNow()))) return;
  await prisma.raffle.update({ where: { id }, data: { status: "CANCELLED" } });
  revalidatePath(`/patrocinador/sorteo/${id}`);
}

export async function markDeliveredAction(_: FormState, fd: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  const id = String(fd.get("deliveryId"));
  const d = await prisma.prizeDelivery.findUnique({ where: { id }, include: { raffle: true } });
  if (!user || !d || (user.sponsor?.id !== d.raffle.sponsorId && user.role !== "ADMIN")) return { error: "No autorizado" };
  if (d.status !== "CLAIMED") return { error: "El ganador aún no ha aceptado el premio" };
  const notes = String(fd.get("notes") ?? "").trim();
  await prisma.prizeDelivery.update({ where: { id }, data: { status: "DELIVERED", notes: notes || null } });
  await notify(d.userId, "📦 Tu premio está en camino", `${d.raffle.title}${notes ? ` · ${notes}` : ""}`, "/perfil#premios");
  revalidatePath(`/patrocinador/sorteo/${d.raffleId}`);
  revalidatePath("/admin/entregas");
  return { ok: "Marcado como entregado y ganador avisado" };
}
