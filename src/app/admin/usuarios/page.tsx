import { prisma } from "@/lib/db";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { adjustWildcardsAction, toggleBanAction } from "@/app/actions/admin";

export default async function AdminUsers({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const users = await prisma.user.findMany({
    where: q ? { OR: [{ email: { contains: q, mode: "insensitive" } }, { name: { contains: q, mode: "insensitive" } }] } : {},
    include: { _count: { select: { tickets: true } }, sponsor: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  const balances = await prisma.wildcardEntry.groupBy({ by: ["userId"], where: { userId: { in: users.map((u) => u.id) } }, _sum: { amount: true } });
  return (
    <div>
      <h1 className="h1">Usuarios</h1>
      <form className="mt-3 flex max-w-md gap-2">
        <input name="q" defaultValue={q} placeholder="Buscar por nombre o email" className="input" />
        <button className="btn-ghost">Buscar</button>
      </form>
      <div className="card mt-4 overflow-x-auto">
        <table className="table">
          <thead><tr><th>Usuario</th><th>Rol</th><th>Tel.</th><th>Papeletas</th><th>Comodines</th><th>Ajustar</th><th></th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className={u.banned ? "opacity-50" : ""}>
                <td><b>{u.name}</b><p className="text-xs text-violet-500">{u.email}{u.sponsor ? ` · ${u.sponsor.companyName}` : ""}</p></td>
                <td>{u.role}</td>
                <td>{u.phoneVerified ? "✅" : "—"}</td>
                <td>{u._count.tickets}</td>
                <td>{balances.find((b) => b.userId === u.id)?._sum.amount ?? 0}</td>
                <td>
                  {u.role === "USER" && (
                    <ActionForm action={adjustWildcardsAction} className="flex gap-1">
                      <input type="hidden" name="userId" value={u.id} />
                      <input name="amount" type="number" placeholder="±" className="input w-20 py-1" />
                      <SubmitButton className="btn-ghost py-1">OK</SubmitButton>
                    </ActionForm>
                  )}
                </td>
                <td>
                  {u.role !== "ADMIN" && (
                    <form action={toggleBanAction}>
                      <input type="hidden" name="userId" value={u.id} />
                      <button className="text-xs font-semibold text-rose-600 hover:underline">{u.banned ? "Desbloquear" : "Bloquear"}</button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
