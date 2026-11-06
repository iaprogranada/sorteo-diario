import { prisma } from "@/lib/db";
import { now as clockNow, getClockOffsetMs, testClockEnabled } from "@/lib/clock";
import { tickSafe } from "@/lib/engine";
import { liveWhere } from "@/lib/raffles";
import { formatDateTime, dayKey } from "@/lib/time";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { advanceClockAction, runTickAction } from "@/app/actions/admin";

export default async function AdminHome() {
  await tickSafe();
  const now = await clockNow();
  const offset = await getClockOffsetMs();
  const today = dayKey(now);
  const [users, verified, sponsors, live, pending, tickets, leads, pendingClaims, earnedToday, banners] = await Promise.all([
    prisma.user.count({ where: { role: "USER" } }),
    prisma.user.count({ where: { role: "USER", phoneVerified: true } }),
    prisma.sponsor.count(),
    prisma.raffle.count({ where: liveWhere(now) }),
    prisma.raffle.count({ where: { status: "PENDING" } }),
    prisma.ticket.count(),
    prisma.lead.count(),
    prisma.prizeDelivery.count({ where: { status: { in: ["PENDING_CLAIM", "CLAIMED"] } } }),
    prisma.wildcardEntry.aggregate({ where: { dayKey: today, amount: { gt: 0 } }, _sum: { amount: true } }),
    prisma.adBanner.aggregate({ _sum: { impressions: true, clicks: true } }),
  ]);
  const kpis: [string, number | string][] = [
    ["Usuarios", users],
    ["Verificados", verified],
    ["Patrocinadores", sponsors],
    ["Sorteos abiertos", live],
    ["Pendientes de aprobar", pending],
    ["Papeletas emitidas", tickets],
    ["Leads generados", leads],
    ["Premios en curso", pendingClaims],
    ["Comodines dados hoy", earnedToday._sum.amount ?? 0],
    ["Impresiones banners", banners._sum.impressions ?? 0],
    ["Clics banners", banners._sum.clicks ?? 0],
  ];
  return (
    <div className="space-y-6">
      <h1 className="h1">Panel de administración</h1>
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {kpis.map(([k, v]) => (
          <div key={k} className="card p-4">
            <p className="text-xs uppercase tracking-wide text-violet-500">{k}</p>
            <p className="text-2xl font-black text-violet-950">{v.toLocaleString("es-ES")}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="card space-y-3 p-5">
          <h2 className="h2">⚙️ Tareas programadas</h2>
          <p className="text-sm text-violet-700">Cierran los sorteos vencidos, eligen ganador y caducan premios no reclamados. En producción se ejecutan solas cada 5 minutos.</p>
          <ActionForm action={runTickAction}>
            <SubmitButton>Ejecutar ahora</SubmitButton>
          </ActionForm>
        </section>
        {testClockEnabled() && (
          <section className="card space-y-3 border-amber-300 p-5">
            <h2 className="h2">🧪 Reloj de pruebas</h2>
            <p className="text-sm text-violet-700">
              Hora de la plataforma: <b data-testid="platform-time">{formatDateTime(now)}</b>
              {offset !== 0 && <> (adelantado {Math.round(offset / 3_600_000)} h)</>}
            </p>
            <div className="flex flex-wrap gap-2">
              {[1, 6, 24, 72, 168].map((h) => (
                <ActionForm key={h} action={advanceClockAction}>
                  <input type="hidden" name="hours" value={h} />
                  <SubmitButton className="btn-ghost py-1.5">+{h >= 24 ? `${h / 24} d` : `${h} h`}</SubmitButton>
                </ActionForm>
              ))}
              <ActionForm action={advanceClockAction}>
                <input type="hidden" name="hours" value={0} />
                <SubmitButton className="btn-danger py-1.5">Restablecer</SubmitButton>
              </ActionForm>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
