"use client";

import { useEffect, useState } from "react";

/** Cuenta atrás. `offsetMs` corrige el reloj de pruebas del servidor. */
export function Countdown({ endAt, offsetMs = 0, compact = false }: { endAt: string; offsetMs?: number; compact?: boolean }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const t = () => setNow(Date.now() + offsetMs);
    t();
    const id = setInterval(t, 1000);
    return () => clearInterval(id);
  }, [offsetMs]);
  if (now === null) return <span>…</span>;
  const ms = new Date(endAt).getTime() - now;
  if (ms <= 0) return <span>Cerrado</span>;
  const d = Math.floor(ms / 86_400_000);
  const h = Math.floor((ms % 86_400_000) / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  if (compact) return <span>{d > 0 ? `${d}d ${h}h` : `${pad(h)}:${pad(m)}:${pad(s)}`}</span>;
  return (
    <span className="tabular-nums">
      {d > 0 && `${d}d `}
      {pad(h)}h {pad(m)}m {pad(s)}s
    </span>
  );
}
