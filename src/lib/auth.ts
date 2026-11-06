import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { prisma } from "./db";
import type { Role, User } from "@prisma/client";

const SESSION_COOKIE = "sd_session";
const DEVICE_COOKIE = "sd_device";
const SESSION_DAYS = 30;

function secret() {
  return new TextEncoder().encode(process.env.SESSION_SECRET ?? "dev-secret");
}

export async function hashPassword(pw: string) {
  return bcrypt.hash(pw, 10);
}

export async function verifyPassword(pw: string, hash: string) {
  return bcrypt.compare(pw, hash);
}

export function newReferralCode() {
  return randomBytes(4).toString("hex").toUpperCase();
}

export async function clientInfo() {
  const h = await headers();
  const c = await cookies();
  const ip = (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "local").trim();
  let deviceId = c.get(DEVICE_COOKIE)?.value;
  if (!deviceId) {
    deviceId = randomBytes(12).toString("hex");
    c.set(DEVICE_COOKIE, deviceId, { httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 365 * 2, path: "/" });
  }
  return { ip, deviceId };
}

export async function createSession(userId: string) {
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  const session = await prisma.session.create({ data: { userId, expiresAt } });
  const token = await new SignJWT({ sid: session.id })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(expiresAt)
    .sign(secret());
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/",
  });
  const { ip, deviceId } = await clientInfo();
  await prisma.loginEvent.create({ data: { userId, ip, deviceId } });
}

export async function destroySession() {
  const c = await cookies();
  const token = c.get(SESSION_COOKIE)?.value;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, secret());
      await prisma.session.deleteMany({ where: { id: String(payload.sid) } });
    } catch {}
  }
  c.delete(SESSION_COOKIE);
}

export async function getCurrentUser(): Promise<(User & { sponsor: { id: string; companyName: string } | null }) | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    const session = await prisma.session.findUnique({
      where: { id: String(payload.sid) },
      include: { user: { include: { sponsor: { select: { id: true, companyName: true } } } } },
    });
    if (!session || session.expiresAt < new Date() || session.user.banned) return null;
    return session.user;
  } catch {
    return null;
  }
}

export async function requireUser(roles?: Role[]) {
  const user = await getCurrentUser();
  if (!user) redirect("/entrar");
  if (roles && !roles.includes(user.role)) redirect("/");
  return user;
}

export async function requireSponsor() {
  const user = await requireUser(["SPONSOR", "ADMIN"]);
  if (!user.sponsor) redirect("/");
  return user as typeof user & { sponsor: { id: string; companyName: string } };
}

export async function requireAdmin() {
  return requireUser(["ADMIN"]);
}
