import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { formatDateTime } from "@/lib/time";
import { markNotificationsReadAction } from "@/app/actions/profile";

export default async function NotificationsPage() {
  const user = await requireUser();
  const list = await prisma.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 50 });
  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="h1">🔔 Notificaciones</h1>
        <form action={markNotificationsReadAction}>
          <button className="btn-ghost py-1.5">Marcar todo como leído</button>
        </form>
      </div>
      <ul className="mt-4 space-y-2">
        {list.map((n) => (
          <li key={n.id} className={`card p-4 ${n.read ? "opacity-70" : "border-violet-300"}`}>
            <p className="font-semibold text-violet-950">{n.title}</p>
            <p className="text-sm text-violet-700">{n.body}</p>
            <p className="mt-1 flex justify-between text-xs text-violet-400">
              <span>{formatDateTime(n.createdAt)} {n.emailed && "· también por email"}</span>
              {n.link && <Link href={n.link} className="font-semibold text-violet-600 hover:underline">Ver →</Link>}
            </p>
          </li>
        ))}
        {list.length === 0 && <li className="card p-6 text-center text-sm text-violet-500">No tienes notificaciones.</li>}
      </ul>
    </main>
  );
}
