import { prisma } from "@/lib/db";
import { generateSeed } from "@/lib/draw";
import type { RaffleType } from "@prisma/client";

let n = 0;
export async function makeUser() {
  n++;
  return prisma.user.create({
    data: { email: `u${n}-${Date.now()}@t.com`, name: `User ${n}`, passwordHash: "x", referralCode: `R${n}${Date.now()}`, phoneVerified: true },
  });
}

export async function makeRaffle(opts: { type?: RaffleType; maxTotal?: number; startOffsetH?: number; durationH?: number } = {}) {
  const u = await prisma.user.create({
    data: { email: `s${++n}-${Date.now()}@t.com`, name: "Sponsor", passwordHash: "x", referralCode: `S${n}${Date.now()}`, role: "SPONSOR", sponsor: { create: { companyName: "Test" } } },
    include: { sponsor: true },
  });
  const start = new Date(Date.now() + (opts.startOffsetH ?? -1) * 3_600_000);
  return prisma.raffle.create({
    data: {
      sponsorId: u.sponsor!.id,
      title: "Test",
      description: "Test",
      prizeValue: 50,
      type: opts.type ?? "REGULAR",
      status: "APPROVED",
      startAt: start,
      endAt: new Date(start.getTime() + (opts.durationH ?? 24) * 3_600_000),
      maxTotalTickets: opts.maxTotal,
      ...generateSeed(),
      actions: { create: [{ isUnlock: true, type: "VISIT", label: "Visita", url: "https://x.com", seconds: 0 }] },
    },
    include: { actions: true, sponsor: true },
  });
}
