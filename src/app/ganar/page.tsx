import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getSettings, type RewardReason } from "@/lib/settings";
import { earnedToday, wildcardBalance } from "@/lib/rewards";
import { now as clockNow } from "@/lib/clock";
import { dayKey } from "@/lib/time";
import { youtubeEmbed } from "@/lib/raffles";
import { AdVideoTask } from "@/components/AdVideoTask";

export default async function EarnPage() {
  const user = await requireUser(["USER"]);
  const [settings, now] = await Promise.all([getSettings(), clockNow()]);
  const today = dayKey(now);
  const [balance, earned, entries, banners] = await Promise.all([
    wildcardBalance(user.id),
    earnedToday(user.id, today),
    prisma.wildcardEntry.findMany({ where: { userId: user.id } }),
    prisma.adBanner.findMany({ where: { active: true, videoUrl: { not: null } } }),
  ]);
  const countToday = (r: RewardReason) => entries.filter((e) => e.reason === r && e.dayKey === today).length;
  const ever = (r: RewardReason) => entries.some((e) => e.reason === r);
  const adsLeft = (settings.rewards.AD_VIDEO.dailyLimit ?? 0) - countToday("AD_VIDEO");
  const capReached = earned >= settings.dailyWildcardCap;

  const tasks: { reason: RewardReason; done: boolean; progress: string; cta?: React.ReactNode }[] = [
    { reason: "WELCOME", done: ever("WELCOME"), progress: ever("WELCOME") ? "Conseguido" : "Pendiente", cta: !user.phoneVerified && <Link href="/verificar-telefono" className="btn-primary py-1.5">Verificar</Link> },
    { reason: "PROFILE", done: ever("PROFILE"), progress: ever("PROFILE") ? "Conseguido" : "Pendiente", cta: !ever("PROFILE") && <Link href="/perfil" className="btn-primary py-1.5">Completar</Link> },
    { reason: "DAILY_LOGIN", done: countToday("DAILY_LOGIN") > 0, progress: countToday("DAILY_LOGIN") > 0 ? "Hoy ya lo tienes" : "Vuelve mañana" },
    { reason: "STREAK_7", done: false, progress: `Llevas ${user.streak} día${user.streak === 1 ? "" : "s"} · faltan ${7 - (user.streak % 7)}` },
    { reason: "REFERRAL", done: false, progress: `${countToday("REFERRAL")}/${settings.rewards.REFERRAL.dailyLimit} hoy`, cta: <Link href="/perfil" className="btn-ghost py-1.5">Mi enlace</Link> },
    { reason: "SHARE", done: false, progress: `${countToday("SHARE")}/${settings.rewards.SHARE.dailyLimit} hoy`, cta: <Link href="/" className="btn-ghost py-1.5">Ver sorteos</Link> },
    { reason: "AD_VIDEO", done: false, progress: `${countToday("AD_VIDEO")}/${settings.rewards.AD_VIDEO.dailyLimit} hoy` },
  ];

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <div>
        <h1 className="h1">🃏 Gana comodines gratis</h1>
        <p className="mt-1 text-violet-700">
          Los comodines son papeletas libres: los pones en el sorteo que más te guste (respetando el máximo de cada sorteo).
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="card p-4">
          <p className="text-xs uppercase tracking-wide text-violet-500">Tienes</p>
          <p className="text-3xl font-black text-violet-950">🃏 {balance}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs uppercase tracking-wide text-violet-500">Ganados hoy</p>
          <p className="text-3xl font-black text-violet-950">{earned} / {settings.dailyWildcardCap}</p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-violet-100">
            <div className="h-full bg-amber-400" style={{ width: `${Math.min(100, (earned / settings.dailyWildcardCap) * 100)}%` }} />
          </div>
        </div>
      </div>
      {capReached && <p className="card border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">Hoy has llegado al tope diario. ¡Mañana más!</p>}

      <section className="card divide-y divide-violet-50">
        {tasks.map((t) => {
          const rule = settings.rewards[t.reason];
          return (
            <div key={t.reason} className="flex flex-wrap items-center gap-3 p-4">
              <span className={`flex h-10 w-10 items-center justify-center rounded-xl text-sm font-black ${t.done ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-900"}`}>
                {t.done ? "✓" : `+${rule.amount}`}
              </span>
              <div className="flex-1">
                <p className="font-semibold text-violet-950">{rule.label}</p>
                <p className="text-xs text-violet-500">{t.progress}{rule.once ? " · una sola vez" : ""}</p>
              </div>
              {t.cta}
            </div>
          );
        })}
      </section>

      <section>
        <h2 className="h2">▶️ Vídeos de anunciantes</h2>
        <p className="text-sm text-violet-500">Te quedan {Math.max(0, adsLeft)} hoy.</p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          {banners.map((b) => (
            <AdVideoTask
              key={b.id}
              disabled={adsLeft <= 0 || capReached || !user.phoneVerified}
              banner={{ id: b.id, title: b.title, advertiser: b.advertiser, emoji: b.emoji, embedUrl: youtubeEmbed(b.videoUrl), videoUrl: b.videoUrl!, seconds: b.videoSeconds }}
            />
          ))}
          {banners.length === 0 && <p className="text-sm text-violet-500">No hay vídeos disponibles ahora mismo.</p>}
        </div>
      </section>
    </main>
  );
}
