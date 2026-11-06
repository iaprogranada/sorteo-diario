import { prisma } from "@/lib/db";
import { toggleBanAction } from "@/app/actions/admin";

export default async function AdminFraud() {
  // Cuentas que comparten IP o dispositivo (registro o inicios de sesión)
  const byIp = await prisma.$queryRaw<{ key: string; users: string[] }[]>`
    SELECT ip AS key, array_agg(DISTINCT "userId") AS users FROM (
      SELECT "registerIp" AS ip, id AS "userId" FROM "User" WHERE "registerIp" IS NOT NULL AND role = 'USER'
      UNION SELECT l.ip, l."userId" FROM "LoginEvent" l JOIN "User" u ON u.id = l."userId" WHERE l.ip IS NOT NULL AND u.role = 'USER'
    ) t GROUP BY ip HAVING COUNT(DISTINCT "userId") > 1 ORDER BY COUNT(DISTINCT "userId") DESC LIMIT 50`;
  const byDevice = await prisma.$queryRaw<{ key: string; users: string[] }[]>`
    SELECT dev AS key, array_agg(DISTINCT "userId") AS users FROM (
      SELECT "deviceId" AS dev, id AS "userId" FROM "User" WHERE "deviceId" IS NOT NULL AND role = 'USER'
      UNION SELECT l."deviceId", l."userId" FROM "LoginEvent" l JOIN "User" u ON u.id = l."userId" WHERE l."deviceId" IS NOT NULL AND u.role = 'USER'
    ) t GROUP BY dev HAVING COUNT(DISTINCT "userId") > 1 ORDER BY COUNT(DISTINCT "userId") DESC LIMIT 50`;
  const ids = [...new Set([...byIp, ...byDevice].flatMap((g) => g.users))];
  const users = await prisma.user.findMany({ where: { id: { in: ids } }, include: { _count: { select: { tickets: true } } } });

  const Group = ({ title, groups }: { title: string; groups: typeof byIp }) => (
    <section>
      <h2 className="h2">{title}</h2>
      <div className="mt-3 space-y-3">
        {groups.map((g) => (
          <div key={g.key} className="card p-4" data-testid="fraud-group">
            <p className="font-mono text-xs text-violet-500">{g.key} · {g.users.length} cuentas</p>
            <ul className="mt-2 divide-y divide-violet-50 text-sm">
              {g.users.map((id) => {
                const u = users.find((x) => x.id === id);
                if (!u) return null;
                return (
                  <li key={id} className="flex items-center justify-between py-1.5">
                    <span>{u.name} · {u.email} · {u._count.tickets} papeletas {u.banned && <span className="badge bg-rose-100 text-rose-700">Bloqueado</span>}</span>
                    <form action={toggleBanAction}>
                      <input type="hidden" name="userId" value={id} />
                      <button className={`text-xs font-semibold hover:underline ${u.banned ? "text-emerald-700" : "text-rose-600"}`}>{u.banned ? "Desbloquear" : "Bloquear"}</button>
                    </form>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
        {groups.length === 0 && <p className="card p-4 text-sm text-violet-500">Nada sospechoso.</p>}
      </div>
    </section>
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="h1">Antifraude</h1>
        <p className="text-violet-700">Varias cuentas desde la misma conexión o el mismo navegador pueden ser multicuentas. Revísalo antes de entregar un premio. (Una misma IP también puede ser una familia o una oficina.)</p>
      </div>
      <Group title="🌐 Misma IP" groups={byIp} />
      <Group title="💻 Mismo dispositivo" groups={byDevice} />
    </div>
  );
}
