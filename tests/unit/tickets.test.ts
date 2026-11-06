import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { allocateTickets } from "@/lib/tickets";
import { grantWildcards, spendWildcards, wildcardBalance, registerDailyLogin } from "@/lib/rewards";
import { drawRaffle } from "@/lib/engine";
import { pickWinners } from "@/lib/draw";
import { makeRaffle, makeUser } from "./helpers";

afterAll(() => prisma.$disconnect());

describe("Papeletas", () => {
  it("tope de 10 en sorteos regulares", async () => {
    const r = await makeRaffle();
    const u = await makeUser();
    expect(await allocateTickets({ raffleId: r.id, userId: u.id, count: 8, source: "ACTION" })).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(await allocateTickets({ raffleId: r.id, userId: u.id, count: 5, source: "ACTION" })).toEqual([9, 10]);
    expect(await allocateTickets({ raffleId: r.id, userId: u.id, count: 1, source: "ACTION" })).toEqual([]);
  });

  it("tope de 30 en sorteos especiales", async () => {
    const r = await makeRaffle({ type: "SPECIAL" });
    const u = await makeUser();
    const got = await allocateTickets({ raffleId: r.id, userId: u.id, count: 50, source: "WILDCARD" });
    expect(got).toHaveLength(30);
  });

  it("premium: ilimitadas", async () => {
    const r = await makeRaffle({ type: "PREMIUM" });
    const u = await makeUser();
    expect(await allocateTickets({ raffleId: r.id, userId: u.id, count: 200, source: "WILDCARD" })).toHaveLength(200);
  });

  it("numeración correlativa sin huecos ni repetidos con 40 peticiones simultáneas", async () => {
    const r = await makeRaffle({ type: "PREMIUM" });
    const users = await Promise.all(Array.from({ length: 8 }, () => makeUser()));
    await Promise.all(
      Array.from({ length: 40 }, (_, i) => allocateTickets({ raffleId: r.id, userId: users[i % 8].id, count: 3, source: "ACTION" })),
    );
    const nums = (await prisma.ticket.findMany({ where: { raffleId: r.id }, select: { number: true } })).map((t) => t.number).sort((a, b) => a - b);
    expect(nums).toEqual(Array.from({ length: 120 }, (_, i) => i + 1));
    expect((await prisma.raffle.findUnique({ where: { id: r.id } }))!.ticketCount).toBe(120);
  });

  it("el tope por persona se respeta también con peticiones simultáneas", async () => {
    const r = await makeRaffle();
    const u = await makeUser();
    await Promise.all(Array.from({ length: 10 }, () => allocateTickets({ raffleId: r.id, userId: u.id, count: 3, source: "ACTION" })));
    expect(await prisma.ticket.count({ where: { raffleId: r.id, userId: u.id } })).toBe(10);
  });

  it("al agotarse las papeletas totales el sorteo se cierra", async () => {
    const r = await makeRaffle({ maxTotal: 12 });
    const [a, b] = [await makeUser(), await makeUser()];
    await allocateTickets({ raffleId: r.id, userId: a.id, count: 10, source: "ACTION" });
    expect(await allocateTickets({ raffleId: r.id, userId: b.id, count: 5, source: "ACTION" })).toEqual([11, 12]);
    const after = await prisma.raffle.findUnique({ where: { id: r.id } });
    expect(after!.endAt.getTime()).toBeLessThanOrEqual(Date.now());
    await expect(allocateTickets({ raffleId: r.id, userId: b.id, count: 1, source: "ACTION" })).rejects.toThrow();
  });

  it("no se pueden conseguir papeletas en sorteos no abiertos", async () => {
    const r = await makeRaffle({ startOffsetH: 5 });
    const u = await makeUser();
    await expect(allocateTickets({ raffleId: r.id, userId: u.id, count: 1, source: "ACTION" })).rejects.toThrow(/no está abierto/);
  });
});

describe("Comodines", () => {
  it("bienvenida solo una vez y fuera del tope diario", async () => {
    const u = await makeUser();
    expect(await grantWildcards(u.id, "WELCOME")).toBe(10);
    expect(await grantWildcards(u.id, "WELCOME")).toBe(0);
    expect(await wildcardBalance(u.id)).toBe(10);
  });

  it("límite de veces al día por tarea", async () => {
    const u = await makeUser();
    const got = [];
    for (let i = 0; i < 5; i++) got.push(await grantWildcards(u.id, "SHARE"));
    expect(got).toEqual([1, 1, 1, 0, 0]);
  });

  it("tope diario total de 25", async () => {
    const u = await makeUser();
    await prisma.wildcardEntry.create({ data: { userId: u.id, amount: 23, reason: "REFERRAL", dayKey: (await import("@/lib/time")).dayKey(new Date()) } });
    expect(await grantWildcards(u.id, "REFERRAL")).toBe(2); // solo quedan 2 hasta 25
    expect(await grantWildcards(u.id, "AD_VIDEO")).toBe(0);
  });

  it("gastar comodines exige desbloquear y respeta el saldo y el tope", async () => {
    const r = await makeRaffle();
    const u = await makeUser();
    await grantWildcards(u.id, "WELCOME"); // 10
    await expect(spendWildcards(u.id, r.id, 2)).rejects.toThrow(/desbloquea/);
    await prisma.actionCompletion.create({ data: { actionId: r.actions[0].id, userId: u.id, completedAt: new Date() } });
    await allocateTickets({ raffleId: r.id, userId: u.id, count: 3, source: "UNLOCK" });
    await expect(spendWildcards(u.id, r.id, 11)).rejects.toThrow(/Solo tienes/);
    const nums = await spendWildcards(u.id, r.id, 10); // cabe 7 (10 - 3)
    expect(nums).toHaveLength(7);
    expect(await wildcardBalance(u.id)).toBe(3); // solo se gastan los usados
  });

  it("entrada diaria idempotente", async () => {
    const u = await makeUser();
    const a = await registerDailyLogin(u.id);
    const b = await registerDailyLogin(u.id);
    expect(a?.daily).toBe(2);
    expect(b).toBeNull();
  });
});

describe("Cierre y sorteo", () => {
  it("cierra, elige ganador verificable y crea la entrega", async () => {
    const r = await makeRaffle();
    const users = await Promise.all(Array.from({ length: 5 }, () => makeUser()));
    for (const u of users) await allocateTickets({ raffleId: r.id, userId: u.id, count: 4, source: "ACTION" });
    await prisma.raffle.update({ where: { id: r.id }, data: { endAt: new Date(Date.now() - 1000) } });
    expect(await drawRaffle(r.id)).toBe(true);
    expect(await drawRaffle(r.id)).toBe(false); // idempotente
    const closed = await prisma.raffle.findUnique({ where: { id: r.id }, include: { draw: true, deliveries: true, tickets: true } });
    expect(closed!.status).toBe("CLOSED");
    const d = closed!.draw!;
    expect(d.totalTickets).toBe(20);
    expect(d.winnerNumbers).toHaveLength(3);
    // Recalcular de forma independiente
    const owner = new Map(closed!.tickets.map((t) => [t.number, t.userId]));
    const again = pickWinners(closed!.secretSeed, d.drandRandomness!, 20, (n) => owner.get(n)!);
    expect(again.map((p) => p.number)).toEqual(d.winnerNumbers);
    expect(closed!.deliveries).toHaveLength(1);
    expect(closed!.deliveries[0].userId).toBe(d.winnerUserIds[0]);
  });

  it("sorteo sin participantes se cierra sin ganador", async () => {
    const r = await makeRaffle();
    await prisma.raffle.update({ where: { id: r.id }, data: { endAt: new Date(Date.now() - 1000) } });
    expect(await drawRaffle(r.id)).toBe(true);
    const d = await prisma.draw.findUnique({ where: { raffleId: r.id } });
    expect(d!.winnerNumbers).toEqual([]);
  });
});
