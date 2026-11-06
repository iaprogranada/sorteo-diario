import Link from "next/link";
import { Countdown } from "./Countdown";
import { gradientFor, TYPE_LABEL, type RaffleCardData } from "@/lib/raffles";

export function RaffleCard({ r, offsetMs }: { r: RaffleCardData; offsetMs: number }) {
  const value = Number(r.prizeValue);
  return (
    <Link href={`/sorteo/${r.id}`} className="card group flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-md" data-testid="raffle-card">
      <div className={`relative flex h-40 items-center justify-center bg-gradient-to-br ${gradientFor(r.category + r.id)}`}>
        {r.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={r.imageUrl} alt={r.title} className="h-full w-full object-cover" />
        ) : (
          <span className="text-6xl drop-shadow-sm transition group-hover:scale-110">{r.emoji}</span>
        )}
        {r.type !== "REGULAR" && (
          <span className={`badge absolute left-3 top-3 ${r.type === "SPECIAL" ? "bg-amber-400 text-violet-950" : "bg-violet-950 text-amber-300"}`}>
            ⭐ {TYPE_LABEL[r.type]}
          </span>
        )}
        <span className="badge absolute right-3 top-3 bg-white/90 text-violet-900">⏱ <Countdown endAt={r.endAt.toISOString()} offsetMs={offsetMs} compact /></span>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <p className="text-xs font-medium text-violet-500">
          {r.sponsor.logoEmoji} {r.sponsor.companyName}
        </p>
        <h3 className="mt-1 line-clamp-2 font-bold text-violet-950">{r.title}</h3>
        <div className="mt-auto flex items-center justify-between pt-3 text-xs text-violet-600">
          <span>Valor {value.toLocaleString("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })}</span>
          <span>🎟️ {r.ticketCount} papeletas</span>
        </div>
        <span className="btn-primary mt-3 w-full">🔓 Desbloquear</span>
      </div>
    </Link>
  );
}
