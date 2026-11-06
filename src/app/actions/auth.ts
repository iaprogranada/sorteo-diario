"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { clientInfo, createSession, destroySession, getCurrentUser, hashPassword, newReferralCode, verifyPassword } from "@/lib/auth";
import { grantWildcards } from "@/lib/rewards";
import { notify } from "@/lib/notify";
import type { FormState } from "@/components/ActionForm";

const registerSchema = z.object({
  name: z.string().trim().min(2, "Pon tu nombre"),
  email: z.string().trim().toLowerCase().pipe(z.email("Email no válido")),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
  phone: z.string().trim().regex(/^(\+34)?\s?[6789]\d{2}\s?\d{3}\s?\d{3}$/, "Teléfono español no válido").optional().or(z.literal("")),
  adult: z.literal("on", { message: "Debes ser mayor de 18 años" }),
  terms: z.literal("on", { message: "Debes aceptar las bases y la privacidad" }),
  ref: z.string().optional(),
  kind: z.enum(["user", "sponsor"]).default("user"),
  companyName: z.string().trim().optional(),
  website: z.string().trim().optional(),
});

function smsCode() {
  return process.env.SMS_MODE === "live" ? String(Math.floor(100000 + Math.random() * 900000)) : "123456";
}

export async function registerAction(_: FormState, fd: FormData): Promise<FormState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  if (d.kind === "user" && !d.phone) return { error: "El teléfono es obligatorio para participar" };
  if (d.kind === "sponsor" && !d.companyName) return { error: "Pon el nombre de tu empresa" };
  if (await prisma.user.findUnique({ where: { email: d.email } })) return { error: "Ya existe una cuenta con ese email" };

  const phone = d.phone ? d.phone.replace(/\s/g, "").replace(/^\+34/, "") : null;
  if (phone && (await prisma.user.findFirst({ where: { phone, phoneVerified: true } }))) {
    return { error: "Ese teléfono ya está en uso en otra cuenta" };
  }
  const referrer = d.ref ? await prisma.user.findUnique({ where: { referralCode: d.ref.toUpperCase() } }) : null;
  const { ip, deviceId } = await clientInfo();
  const user = await prisma.user.create({
    data: {
      name: d.name,
      email: d.email,
      passwordHash: await hashPassword(d.password),
      role: d.kind === "sponsor" ? "SPONSOR" : "USER",
      phone,
      phoneCode: phone ? smsCode() : null,
      referralCode: newReferralCode(),
      referredById: referrer?.id,
      registerIp: ip,
      deviceId,
      ...(d.kind === "sponsor"
        ? { sponsor: { create: { companyName: d.companyName!, website: d.website || null } } }
        : {}),
    },
  });
  await createSession(user.id);
  // Aquí en producción se envía el SMS real (Twilio)
  redirect(d.kind === "sponsor" ? "/patrocinador" : "/verificar-telefono");
}

export async function verifyPhoneAction(_: FormState, fd: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/entrar");
  if (user.phoneVerified) return { ok: "Tu teléfono ya está verificado" };
  const code = String(fd.get("code") ?? "").trim();
  if (!user.phoneCode || code !== user.phoneCode) return { error: "Código incorrecto" };
  if (user.phone && (await prisma.user.findFirst({ where: { phone: user.phone, phoneVerified: true, NOT: { id: user.id } } }))) {
    return { error: "Ese teléfono ya está verificado en otra cuenta" };
  }
  await prisma.user.update({ where: { id: user.id }, data: { phoneVerified: true, phoneCode: null } });
  const welcome = await grantWildcards(user.id, "WELCOME");
  if (user.referredById) {
    const got = await grantWildcards(user.referredById, "REFERRAL", user.id);
    if (got > 0) await notify(user.referredById, "🃏 ¡Tu amigo se ha unido!", `${user.name} se ha verificado. Has ganado ${got} comodines.`, "/perfil");
  }
  await notify(user.id, "¡Bienvenido a Sorteo Diario! 🎉", `Te regalamos ${welcome} comodines para que los uses en los sorteos que más te gusten.`, "/");
  revalidatePath("/", "layout");
  redirect("/?bienvenida=1");
}

export async function loginAction(_: FormState, fd: FormData): Promise<FormState> {
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const password = String(fd.get("password") ?? "");
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) return { error: "Email o contraseña incorrectos" };
  if (user.banned) return { error: "Esta cuenta está bloqueada. Contacta con soporte." };
  await createSession(user.id);
  const next = String(fd.get("next") ?? "");
  redirect(next.startsWith("/") ? next : user.role === "ADMIN" ? "/admin" : user.role === "SPONSOR" ? "/patrocinador" : "/");
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}
