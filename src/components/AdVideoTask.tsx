"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { startAdViewAction, completeAdViewAction } from "@/app/actions/profile";

export function AdVideoTask({ banner, disabled }: { banner: { id: string; title: string; advertiser: string; emoji: string; embedUrl: string | null; videoUrl: string; seconds: number }; disabled: boolean }) {
  const [viewId, setViewId] = useState<string | null>(null);
  const [left, setLeft] = useState(0);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  useEffect(() => {
    if (!viewId || left <= 0) return;
    const t = setInterval(() => document.visibilityState === "visible" && setLeft((l) => Math.max(0, l - 1)), 1000);
    return () => clearInterval(t);
  }, [viewId, left]);
  return (
    <div className="card p-4">
      <p className="font-semibold text-violet-950">{banner.emoji} {banner.title}</p>
      <p className="text-xs text-violet-500">{banner.advertiser} · {banner.seconds} s</p>
      {!viewId ? (
        <button
          className="btn-primary mt-3 w-full"
          disabled={disabled || pending}
          data-testid="ad-video-start"
          onClick={() =>
            start(async () => {
              setViewId(await startAdViewAction(banner.id));
              setLeft(banner.seconds);
            })
          }
        >
          ▶️ Ver anuncio (+1 🃏)
        </button>
      ) : msg ? (
        <p className="mt-3 rounded-lg bg-emerald-50 p-2 text-sm text-emerald-800">{msg}</p>
      ) : (
        <div className="mt-3 space-y-2">
          {banner.embedUrl ? (
            <div className="aspect-video overflow-hidden rounded-lg bg-black">
              <iframe src={banner.embedUrl} className="h-full w-full" allow="autoplay" title={banner.title} />
            </div>
          ) : (
            <a href={banner.videoUrl} target="_blank" rel="noopener" className="btn-ghost w-full">Abrir vídeo ↗</a>
          )}
          <button
            className="btn-accent w-full"
            disabled={left > 0 || pending}
            data-testid="ad-video-complete"
            onClick={() =>
              start(async () => {
                const r = await completeAdViewAction(viewId);
                setMsg(r.message);
                router.refresh();
              })
            }
          >
            {left > 0 ? `Espera ${left} s…` : "✅ Conseguir comodín"}
          </button>
        </div>
      )}
    </div>
  );
}
