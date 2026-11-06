import { prisma } from "@/lib/db";
import type { BannerPosition } from "@prisma/client";

/** Hueco publicitario: elige un banner activo al azar y cuenta la impresión */
export async function AdSlot({ position, className = "" }: { position: BannerPosition; className?: string }) {
  const banners = await prisma.adBanner.findMany({ where: { position, active: true } });
  if (banners.length === 0) {
    return (
      <a href="/anunciate" className={`card flex flex-col items-center justify-center border-dashed p-4 text-center text-xs text-violet-400 hover:text-violet-600 ${className}`}>
        <span className="text-2xl">📣</span>
        <span className="mt-1 font-semibold">Tu marca aquí</span>
        <span>Anúnciate en Sorteo Diario</span>
      </a>
    );
  }
  const b = banners[Math.floor(Math.random() * banners.length)];
  await prisma.adBanner.update({ where: { id: b.id }, data: { impressions: { increment: 1 } } });
  const vertical = position !== "FOOTER";
  return (
    <a
      href={`/api/ad/${b.id}/click`}
      target="_blank"
      rel="noopener sponsored"
      data-testid={`ad-${position.toLowerCase()}`}
      className={`group block overflow-hidden rounded-2xl text-white shadow-sm transition hover:shadow-md ${className}`}
      style={{ background: `linear-gradient(160deg, ${b.color}, #1c1530)` }}
    >
      {b.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={b.imageUrl} alt={b.title} className="w-full object-cover" />
      ) : (
        <div className={vertical ? "flex min-h-[420px] flex-col justify-between p-4" : "flex items-center gap-4 p-4"}>
          <span className="text-[10px] uppercase tracking-widest opacity-70">Publicidad · {b.advertiser}</span>
          <span className={vertical ? "my-6 text-6xl" : "text-4xl"}>{b.emoji}</span>
          <div className={vertical ? "" : "flex-1"}>
            <p className="text-lg font-extrabold leading-tight">{b.title}</p>
            {b.text && <p className="mt-1 text-sm opacity-85">{b.text}</p>}
          </div>
          <span className="mt-4 inline-block rounded-lg bg-white/90 px-3 py-1.5 text-center text-xs font-bold text-violet-900 group-hover:bg-white">
            Saber más →
          </span>
        </div>
      )}
    </a>
  );
}
