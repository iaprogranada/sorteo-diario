import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { wildcardBalance, earnedToday } from "@/lib/rewards";
import { getSettings } from "@/lib/settings";
import { now as clockNow } from "@/lib/clock";
import { dayKey, formatDateTime } from "@/lib/time";
import { PROVINCES, raffleState, STATE_LABEL } from "@/lib/raffles";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { CopyButton } from "@/components/CopyButton";
import { updateProfileAction, claimPrizeAction } from "@/app/actions/profile";

const REASON: Record<string, string> = {
  WELCOME: "Bienvenida",
  PROFILE: "Perfil completado",
  DAILY_LOGIN: "Entrada diaria",
  STREAK_7: "Racha de 7 días",
  REFERRAL: "Amigo invitado",
  AD_VIDEO: "Vídeo de anunciante",
  SHARE: "Compartir sorteo",
  SPEND: "Usados en sorteo",
  ADMIN: "Ajuste del admin",
};

export default async function ProfilePage() {
  const user = await requireUser();
  if (user.role === "SPONSOR") redirect("/patrocinador");
  const now = await clockNow();
  const settings = await getSettings();
  const [balance, today, ledger, tickets, deliveries, referrals] = await Promise.all([
    wildcardBalance(user.id),
    earnedToday(user.id, dayKey(now)),
    prisma.wildcardEntry.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 15 }),
    prisma.ticket.findMany({
      where: { userId: user.id },
      include: { raffle: { select: { id: true, title: true, emoji: true, status: true, startAt: true, endAt: true, draw: { select: { winnerNumbers: true } } } } },
      orderBy: { number: "asc" },
    }),
    prisma.prizeDelivery.findMany({ where: { userId: user.id }, include: { raffle: { include: { sponsor: true } } }, orderBy: { createdAt: "desc" } }),
    prisma.user.count({ where: { referredById: user.id, phoneVerified: true } }),
  ]);
  const byRaffle = new Map<string, { raffle: (typeof tickets)[number]["raffle"]; numbers: number[] }>();
  for (const t of tickets) {
    const e = byRaffle.get(t.raffle.id) ?? { raffle: t.raffle, numbers: [] };
    e.numbers.push(t.number);
    byRaffle.set(t.raffle.id, e);
  }
  const groups = [...byRaffle.values()].sort((a, b) => b.raffle.endAt.getTime() - a.raffle.endAt.getTime());

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <h1 className="h1">Hola, {user.name.split(" ")[0]} 👋</h1>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Comodines disponibles" value={`🃏 ${balance}`} testId="profile-balance" />
        <Stat label="Ganados hoy" value={`${today} / ${settings.dailyWildcardCap}`} />
        <Stat label="Racha" value={`🔥 ${user.streak} día${user.streak === 1 ? "" : "s"}`} hint={`Cada 7 días seguidos: +${settings.rewards.STREAK_7.amount}`} />
      </div>

      {deliveries.length > 0 && (
        <section id="premios" className="card p-5">
          <h2 className="h2">🏆 Mis premios</h2>
          <ul className="mt-3 space-y-3">
            {deliveries.map((d) => (
              <li key={d.id} className="rounded-xl border border-amber-200 bg-amber-50 p-4" data-testid="prize">
                <p className="font-bold text-violet-950">{d.raffle.emoji} {d.raffle.title}</p>
                <p className="text-sm text-violet-700">Patrocinado por {d.raffle.sponsor.companyName}</p>
                {d.status === "PENDING_CLAIM" && (
                  <ActionForm action={claimPrizeAction} className="mt-3 space-y-2">
                    <input type="hidden" name="deliveryId" value={d.id} />
                    <p className="text-sm text-amber-900">Acepta tu premio antes del <b>{formatDateTime(d.claimDeadline)}</b> o pasará al suplente.</p>
                    {d.raffle.deliveryType === "SHIPPING" && (
                      <textarea name="address" required placeholder="Dirección completa de envío (calle, nº, CP, ciudad, provincia)" className="input" rows={2} />
                    )}
                    <SubmitButton className="btn-accent">🎉 Aceptar premio</SubmitButton>
                  </ActionForm>
                )}
                {d.status === "CLAIMED" && <p className="mt-2 text-sm font-semibold text-emerald-700">✅ Aceptado. El patrocinador te contactará para la entrega.</p>}
                {d.status === "DELIVERED" && <p className="mt-2 text-sm font-semibold text-emerald-700">📦 Entregado {d.notes ? `· ${d.notes}` : ""}</p>}
                {d.status === "EXPIRED" && <p className="mt-2 text-sm text-rose-700">Caducado: no se aceptó a tiempo.</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card p-5">
        <h2 className="h2">🎟️ Mis papeletas</h2>
        {groups.length === 0 ? (
          <p className="mt-2 text-sm text-violet-600">Aún no participas en ningún sorteo. <Link href="/" className="font-semibold underline">Ver sorteos</Link></p>
        ) : (
          <ul className="mt-3 divide-y divide-violet-50">
            {groups.map(({ raffle, numbers }) => {
              const st = raffleState(raffle, now);
              const won = raffle.draw?.winnerNumbers[0] && numbers.includes(raffle.draw.winnerNumbers[0]);
              return (
                <li key={raffle.id} className="flex flex-wrap items-center gap-3 py-3">
                  <span className="text-2xl">{raffle.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <Link href={`/sorteo/${raffle.id}`} className="font-semibold text-violet-950 hover:underline">{raffle.title}</Link>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {numbers.map((n) => (
                        <span key={n} className={`rounded px-1.5 py-0.5 font-mono text-xs font-bold ring-1 ${raffle.draw?.winnerNumbers[0] === n ? "bg-amber-300 ring-amber-400" : "bg-violet-50 text-violet-800 ring-violet-200"}`}>#{n}</span>
                      ))}
                    </div>
                  </div>
                  <span className={`badge ${won ? "bg-amber-300 text-violet-950" : st === "live" ? "bg-emerald-100 text-emerald-800" : "bg-violet-100 text-violet-700"}`}>
                    {won ? "🏆 ¡Ganaste!" : st === "closed" ? `Ganó #${raffle.draw?.winnerNumbers[0] ?? "-"}` : STATE_LABEL[st]}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="card p-5">
          <h2 className="h2">👫 Invita a tus amigos</h2>
          <p className="mt-1 text-sm text-violet-700">
            Por cada amigo que se registre y verifique su teléfono ganas <b>{settings.rewards.REFERRAL.amount} comodines</b>. Llevas {referrals} amigo{referrals === 1 ? "" : "s"}.
          </p>
          <div className="mt-3 flex gap-2">
            <input readOnly value={`/registro?ref=${user.referralCode}`} className="input font-mono text-xs" data-testid="referral-link" />
            <CopyButton text={`/registro?ref=${user.referralCode}`} />
          </div>
        </section>

        <section className="card p-5">
          <h2 className="h2">👤 Mi perfil</h2>
          {!user.profileComplete && <p className="mt-1 text-sm text-amber-800">Complétalo y gana <b>+{settings.rewards.PROFILE.amount} comodines</b>.</p>}
          <ActionForm action={updateProfileAction} className="mt-3 space-y-3">
            <input name="name" defaultValue={user.name} className="input" placeholder="Nombre y apellidos" />
            <select name="province" defaultValue={user.province ?? ""} className="input" data-testid="province">
              <option value="">Provincia…</option>
              {PROVINCES.map((p) => <option key={p}>{p}</option>)}
            </select>
            <input name="birthDate" type="date" defaultValue={user.birthDate?.toISOString().slice(0, 10)} className="input" data-testid="birthdate" />
            <p className="text-xs text-violet-500">Email: {user.email} · Teléfono: {user.phone ?? "—"} {user.phoneVerified ? "✅" : ""}</p>
            <SubmitButton>Guardar</SubmitButton>
          </ActionForm>
        </section>
      </div>

      <section className="card p-5">
        <div className="flex items-baseline justify-between">
          <h2 className="h2">🃏 Movimientos de comodines</h2>
          <Link href="/ganar" className="text-sm font-semibold text-violet-600 hover:underline">Ganar más →</Link>
        </div>
        <table className="table mt-2">
          <tbody>
            {ledger.map((e) => (
              <tr key={e.id}>
                <td>{REASON[e.reason] ?? e.reason}</td>
                <td className="text-violet-500">{formatDateTime(e.createdAt)}</td>
                <td className={`text-right font-bold ${e.amount > 0 ? "text-emerald-700" : "text-rose-700"}`}>{e.amount > 0 ? `+${e.amount}` : e.amount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}

function Stat({ label, value, hint, testId }: { label: string; value: string; hint?: string; testId?: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-violet-500">{label}</p>
      <p className="mt-1 text-2xl font-black text-violet-950" data-testid={testId}>{value}</p>
      {hint && <p className="text-xs text-violet-500">{hint}</p>}
    </div>
  );
}
