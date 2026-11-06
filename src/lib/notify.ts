import { prisma } from "./db";

/**
 * Notificación en la app + email.
 * En pruebas el email se simula (se registra en consola y se marca como "emailed").
 * En producción aquí se conectará Resend.
 */
export async function notify(userId: string, title: string, body: string, link?: string) {
  const n = await prisma.notification.create({ data: { userId, title, body, link, emailed: true } });
  if (process.env.NODE_ENV !== "test") console.log(`[email simulado] -> ${userId}: ${title}`);
  return n;
}
