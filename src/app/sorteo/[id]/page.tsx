import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { now as clockNow, getClockOffsetMs } from "@/lib/clock";
import { tickSafe } from "@/lib/engine";
import { getSettings, maxTicketsFor } from "@/lib/settings";
import { wildcardBalance } from "@/lib/rewards";
import { DELIVERY_LABEL, gradientFor, raffleState, STATE_LABEL, TYPE_LABEL, youtubeEmbed } from "@/lib/raffles";
import { formatDateTime, dayKey } from "@/lib/time";
import { euros, maskName } from "@/lib/format";
import { Countdown } from "@/components/Countdown";
import { ActionRunner } from "@/components/ActionRunner";
import { ShareButton } from "@/components/ShareButton";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { AdSlot } from "@/components/AdSlot";
import { spendWildcardsAction } from "@/app/actions/raffle";

export default async function RafflePage({ params }: { params: Promise<{ id: string }> }) {
  await tickSafe();
  const { id } = await params;
  const raffle = await prisma.raffle.findUnique({
    where: { id },
    include: { sponsor: true, actions: { orderBy: [{ isUnlock: "desc" }, { order: "asc" }] }, draw: true },
  });
  if (!raffle) notFound();
  const [now, offset, user, settings] = await Promise.all([clockNow(), getClockOffsetMs(), getCurrentUser(), getSettings()]);
  const state = raffleState(raffle, now);
  const isOwnerOrAdmin = user && (user.role === "ADMIN" || user.sponsor?.id === raffle.sponsorId);
  if ((state === "pending" || state === "rejected") && !isOwnerOrAdmin) notFound();

  const cap = maxTicketsFor(raffle.type, settings);
  const participant = user?.role === "USER" && user.phoneVerified ? user : null;
  const myTickets = participant
    ? (await prisma.ticket.findMany({ where: { raffleId: id, userId: participant.id }, orderBy: { number: "asc" }, select: { number: true } })).map((t) => t.number)
    : [];
  const completions = participant
    ? await prisma.actionCompletion.findMany({ where: { userId: participant.id, action: { raffleId: id } } })
    : [];
  const doneIds = new Set(completions.filter((c) => c.completedAt).map((c) => c.actionId));
  const unlock = raffle.actions.find((a) => a.isUnlock);
  const unlocked = unlock ? doneIds.has(unlock.id) : false;
  const balance = participant ? await wildcardBalance(participant.id) : 0;
  const remainingCap = cap > 0 ? Math.max(0, cap - myTickets.length) : Infinity;
  const soldOut = !!raffle.maxTotalTickets && raffle.ticketCount >= raffle.maxTotalTickets;
  const sharedToday = participant
    ? await prisma.wildcardEntry.count({ where: { userId: participant.id, reason: "SHARE", dayKey: dayKey(now) } })
    : 0;
  const participants = await prisma.ticket.groupBy({ by: ["userId"], where: { raffleId: id } }).then((g) => g.length);

  const winners = raffle.draw?.winnerUserIds.length
    ? await prisma.user.findMany({ where: { id: { in: raffle.draw.winnerUserIds } }, select: { id: true, name: true, province: true } })
    : [];
  const live = state === "live" && !soldOut;

  const toRunner = (a: (typeof raffle.actions)[number]) => ({
    id: a.id,
    type: a.type,
    label: a.label,
    url: a.url,
    seconds: a.seconds,
    formQuestion: a.formQuestion,
    embedUrl: a.type === "VIDEO" ? youtubeEmbed(a.url) : null,
    isUnlock: a.isUnlock,
    done: doneIds.has(a.id),
    coupon: a.type === "COUPON" && doneIds.has(a.id) ? a.couponCode : null,
  });

  return (
    <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6">
      <main className="min-w-0 flex-1">
        <Link href="/" className="text-sm font-medium text-violet-600 hover:underline">← Todos los sorteos</Link>
        <div className="mt-3 grid gap-6 lg:grid-cols-5">
          {/* Información */}
          <div className="space-y-4 lg:col-span-3">
            <div className={`relative flex aspect-[16/9] items-center justify-center overflow-hidden rounded-3xl bg-gradient-to-br ${gradientFor(raffle.category + raffle.id)}`}>
              {raffle.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={raffle.imageUrl} alt={raffle.title} className="h-full w-full object-cover" />
              ) : (
                <span className="text-9xl drop-shadow">{raffle.emoji}</span>
              )}
              <span className="badge absolute left-4 top-4 bg-white/90 text-violet-900">{TYPE_LABEL[raffle.type]} · {raffle.category}</span>
            </div>
            <div className="card p-5">
              <p className="text-sm font-medium text-violet-500">
                {raffle.sponsor.logoEmoji} Patrocinado por{" "}
                {raffle.sponsor.website ? (
                  <a href={raffle.sponsor.website} target="_blank" rel="noopener" className="underline">{raffle.sponsor.companyName}</a>
                ) : (
                  raffle.sponsor.companyName
                )}
              </p>
              <h1 className="h1 mt-1" data-testid="raffle-title">{raffle.title}</h1>
              <p className="mt-3 whitespace-pre-line text-violet-900">{raffle.description}</p>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                <Info k="Valor" v={euros(raffle.prizeValue.toString())} />
                <Info k="Entrega" v={raffle.deliveryType === "IN_PERSON" ? `En ${raffle.city ?? "local"}` : DELIVERY_LABEL[raffle.deliveryType]} />
                <Info k="Participantes" v={String(participants)} />
                <Info k="Papeletas" v={`${raffle.ticketCount}${raffle.maxTotalTickets ? ` / ${raffle.maxTotalTickets}` : ""}`} />
              </dl>
              <p className="mt-4 text-xs text-violet-500">
                Abierto del {formatDateTime(raffle.startAt)} al {formatDateTime(raffle.endAt)} · Máximo {cap > 0 ? `${cap} papeletas` : "ilimitadas papeletas"} por persona ·{" "}
                <Link href="/legal/bases" className="underline">Bases legales</Link>
              </p>
            </div>
            <div className="card p-5 text-sm">
              <h2 className="h2">🔐 Sorteo verificable</h2>
              <p className="mt-1 text-violet-700">
                Esta huella se publicó al crear el sorteo. Al cerrar revelamos la clave y usamos un número aleatorio público (drand) para elegir la papeleta ganadora. Cualquiera puede comprobarlo.
              </p>
              <code className="mt-2 block break-all rounded-lg bg-violet-50 p-2 text-xs text-violet-800" data-testid="seed-hash">{raffle.seedHash}</code>
              <Link href={`/verificar/${raffle.id}`} className="mt-2 inline-block font-semibold text-violet-600 hover:underline">Cómo se verifica →</Link>
            </div>
          </div>

          {/* Participación */}
          <div className="space-y-4 lg:col-span-2">
            <div className="card sticky top-24 space-y-4 p-5">
              <div className="flex items-center justify-between">
                <span className={`badge ${live ? "bg-emerald-100 text-emerald-800" : "bg-violet-100 text-violet-800"}`} data-testid="raffle-state">
                  {soldOut && state === "live" ? "Papeletas agotadas" : STATE_LABEL[state]}
                </span>
                {state === "live" && (
                  <span className="text-sm font-semibold text-violet-900">⏱ <Countdown endAt={raffle.endAt.toISOString()} offsetMs={offset} /></span>
                )}
                {state === "scheduled" && <span className="text-sm text-violet-700">Abre el {formatDateTime(raffle.startAt)}</span>}
              </div>

              {state === "closed" && raffle.draw && (
                <div className="rounded-2xl bg-gradient-to-br from-amber-300 to-amber-400 p-4 text-violet-950" data-testid="winner-box">
                  {raffle.draw.winnerNumbers.length ? (
                    <>
                      <p className="text-sm font-semibold">🏆 Papeleta ganadora</p>
                      <p className="text-4xl font-black">#{raffle.draw.winnerNumbers[0]}</p>
                      <p className="text-sm">{maskName(winners.find((w) => w.id === raffle.draw!.winnerUserIds[0])?.name)}</p>
                      {raffle.draw.winnerNumbers.length > 1 && (
                        <p className="mt-2 text-xs">Suplentes: {raffle.draw.winnerNumbers.slice(1).map((n) => `#${n}`).join(", ")}</p>
                      )}
                      {participant && raffle.draw.winnerUserIds[0] === participant.id && <p className="mt-2 font-bold">¡Eres tú! Ve a tu perfil para aceptar el premio 🎉</p>}
                    </>
                  ) : (
                    <p>Este sorteo terminó sin participantes.</p>
                  )}
                  <Link href={`/verificar/${raffle.id}`} className="mt-2 inline-block text-sm font-bold underline">Verificar resultado</Link>
                </div>
              )}

              {state === "live" && !user && (
                <div className="space-y-2 text-center">
                  <p className="text-sm text-violet-700">Regístrate gratis para desbloquear este sorteo y conseguir papeletas.</p>
                  <Link href={`/registro?next=/sorteo/${raffle.id}`} className="btn-primary w-full py-3">Regístrate gratis</Link>
                  <Link href={`/entrar?next=/sorteo/${raffle.id}`} className="btn-ghost w-full">Ya tengo cuenta</Link>
                </div>
              )}
              {state === "live" && user && user.role !== "USER" && (
                <p className="rounded-lg bg-violet-50 p-3 text-sm text-violet-700">Estás viendo el sorteo como {user.role === "ADMIN" ? "administrador" : "patrocinador"}. Para participar usa una cuenta de usuario.</p>
              )}
              {state === "live" && user?.role === "USER" && !user.phoneVerified && (
                <Link href="/verificar-telefono" className="btn-primary w-full">Verifica tu teléfono para participar</Link>
              )}

              {participant && (state === "live" || myTickets.length > 0) && (
                <>
                  <div className="rounded-xl bg-violet-50 p-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold text-violet-900">Mis papeletas</span>
                      <span className="font-bold text-violet-700" data-testid="my-ticket-count">
                        {myTickets.length}/{cap > 0 ? cap : "∞"}
                      </span>
                    </div>
                    {cap > 0 && (
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-violet-200">
                        <div className="h-full bg-violet-600" style={{ width: `${Math.min(100, (myTickets.length / cap) * 100)}%` }} />
                      </div>
                    )}
                    {myTickets.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1" data-testid="my-tickets">
                        {myTickets.map((n) => (
                          <span key={n} className="rounded-md bg-white px-1.5 py-0.5 font-mono text-xs font-bold text-violet-800 ring-1 ring-violet-200">#{n}</span>
                        ))}
                      </div>
                    )}
                  </div>

                  {live && unlock && <ActionRunner action={toRunner(unlock)} sponsorName={raffle.sponsor.companyName} />}

                  {live && unlocked && (
                    <>
                      {raffle.actions.filter((a) => !a.isUnlock).length > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm font-semibold text-violet-900">Consigue más papeletas</p>
                          {raffle.actions
                            .filter((a) => !a.isUnlock)
                            .map((a) => (
                              <ActionRunner key={a.id} action={toRunner(a)} sponsorName={raffle.sponsor.companyName} capReached={remainingCap === 0} />
                            ))}
                        </div>
                      )}
                      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                        <p className="text-sm font-semibold text-amber-900">🃏 Usa tus comodines ({balance} disponibles)</p>
                        {remainingCap === 0 ? (
                          <p className="mt-1 text-xs text-amber-800">Ya tienes el máximo de papeletas en este sorteo.</p>
                        ) : balance === 0 ? (
                          <p className="mt-1 text-xs text-amber-800">
                            No tienes comodines. <Link href="/ganar" className="font-semibold underline">Consigue más aquí</Link>
                          </p>
                        ) : (
                          <ActionForm action={spendWildcardsAction} className="mt-2">
                            <input type="hidden" name="raffleId" value={raffle.id} />
                            <div className="flex gap-2">
                              <input
                                name="count"
                                type="number"
                                min={1}
                                max={Math.min(balance, remainingCap)}
                                defaultValue={Math.min(balance, remainingCap, 1)}
                                className="input w-24"
                                data-testid="wildcard-count"
                              />
                              <SubmitButton className="btn-accent flex-1">Añadir papeletas</SubmitButton>
                            </div>
                          </ActionForm>
                        )}
                      </div>
                    </>
                  )}
                </>
              )}
              {(state === "live" || state === "scheduled") && (
                <ShareButton raffleId={raffle.id} title={raffle.title} canEarn={!!participant && sharedToday < (settings.rewards.SHARE.dailyLimit ?? 0)} />
              )}
            </div>
          </div>
        </div>
      </main>
      <aside className="sticky top-24 hidden h-fit w-44 shrink-0 xl:block">
        <AdSlot position="RIGHT" />
      </aside>
    </div>
  );
}

function Info({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-xl bg-violet-50 p-2.5">
      <dt className="text-xs text-violet-500">{k}</dt>
      <dd className="font-bold text-violet-950">{v}</dd>
    </div>
  );
}
