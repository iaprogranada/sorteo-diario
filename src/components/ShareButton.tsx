"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { shareRaffleAction } from "@/app/actions/raffle";

export function ShareButton({ raffleId, title, canEarn }: { raffleId: string; title: string; canEarn: boolean }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  function share() {
    const url = `${window.location.origin}/sorteo/${raffleId}`;
    start(async () => {
      try {
        if (navigator.share) await navigator.share({ title, text: `¡Participa gratis en este sorteo! ${title}`, url });
        else await navigator.clipboard.writeText(url);
      } catch {}
      if (canEarn) {
        const r = await shareRaffleAction(raffleId);
        setMsg(r.message);
        router.refresh();
      } else setMsg("Enlace copiado");
    });
  }
  return (
    <div>
      <button onClick={share} disabled={pending} className="btn-ghost w-full" data-testid="share-button">
        📤 Compartir sorteo {canEarn && <span className="badge bg-amber-100 text-amber-900">+1 🃏</span>}
      </button>
      {msg && <p className="mt-1 text-xs text-violet-600">{msg}</p>}
    </div>
  );
}
