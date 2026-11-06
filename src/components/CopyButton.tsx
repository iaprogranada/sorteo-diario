"use client";
import { useState } from "react";
export function CopyButton({ text, label = "Copiar" }: { text: string; label?: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      type="button"
      className="btn-ghost"
      onClick={async () => {
        const full = text.startsWith("/") ? window.location.origin + text : text;
        try { await navigator.clipboard.writeText(full); } catch {}
        setOk(true);
        setTimeout(() => setOk(false), 2000);
      }}
    >
      {ok ? "¡Copiado!" : label}
    </button>
  );
}
