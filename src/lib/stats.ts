import { prisma } from "./db";

export async function raffleStats(raffleId: string) {
  const [participants, actions, leads] = await Promise.all([
    prisma.ticket.groupBy({ by: ["userId"], where: { raffleId } }).then((g) => g.length),
    prisma.raffleAction.findMany({
      where: { raffleId },
      orderBy: [{ isUnlock: "desc" }, { order: "asc" }],
      include: { _count: { select: { completions: true, leads: true } } },
    }),
    prisma.lead.count({ where: { action: { raffleId } } }),
  ]);
  const completed = await prisma.actionCompletion.groupBy({
    by: ["actionId"],
    where: { action: { raffleId }, completedAt: { not: null } },
    _count: true,
  });
  return {
    participants,
    leads,
    actions: actions.map((a) => ({
      ...a,
      started: a._count.completions,
      completed: completed.find((c) => c.actionId === a.id)?._count ?? 0,
    })),
  };
}
