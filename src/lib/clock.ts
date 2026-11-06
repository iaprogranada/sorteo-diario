import { prisma } from "./db";

/**
 * Reloj de la plataforma. En pruebas (ENABLE_TEST_CLOCK=true) el admin puede
 * adelantar el tiempo para comprobar cierres de sorteos sin esperar días.
 */
export function testClockEnabled() {
  return process.env.ENABLE_TEST_CLOCK === "true";
}

export async function getClockOffsetMs(): Promise<number> {
  if (!testClockEnabled()) return 0;
  const row = await prisma.setting.findUnique({ where: { key: "clockOffsetMs" } });
  return typeof row?.value === "number" ? row.value : 0;
}

export async function now(): Promise<Date> {
  return new Date(Date.now() + (await getClockOffsetMs()));
}

export async function setClockOffsetMs(ms: number) {
  await prisma.setting.upsert({
    where: { key: "clockOffsetMs" },
    create: { key: "clockOffsetMs", value: ms },
    update: { value: ms },
  });
}
