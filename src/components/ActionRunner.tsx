"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { startActionAction, completeActionAction, type ActionResult } from "@/app/actions/raffle";

export interface RunnerAction {
  id: string;
  type: "VIDEO" | "VISIT" | "FOLLOW" | "FORM" | "COUPON";
  label: string;
  url: string | null;
  seconds: number;
  formQuestion: string | null;
  embedUrl: string | null;
  isUnlock: boolean;
  done: boolean;
  coupon?: string | null;
}

const ICON = { VIDEO: "▶️", VISIT: "🌐", FOLLOW: "➕", FORM: "📝", COUPON: "🏷️" };

export function ActionRunner({ action, sponsorName, capReached }: { action: RunnerAction; sponsorName: string; capReached?: boolean }) {
  const router = useRouter();
  const [phase, setPhase] = useState<"idle" | "running" | "done">(action.done ? "done" : "idle");
  const [remaining, setRemaining] = useState(0);
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, start] = useTransition();
  const [form, setForm] = useState({ name: "", email: "", phone: "", answer: "", consent: false });

  const needed = action.type === "VIDEO" ? action.seconds : action.type === "VISIT" ? Math.max(action.seconds, 3) : action.type === "FOLLOW" ? 2 : 0;

  // El contador solo avanza con la pestaña visible (vídeo) — evita trampas
  useEffect(() => {
    if (phase !== "running" || remaining <= 0) return;
    const id = setInterval(() => {
      if (action.type === "VIDEO" && document.visibilityState !== "visible") return;
      setRemaining((r) => Math.max(0, r - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [phase, remaining, action.type]);

  function begin() {
    start(async () => {
      const r = await startActionAction(action.id);
      if (!r.ok) return setResult(r);
      setResult(null);
      setRemaining(needed);
      setPhase("running");
      if ((action.type === "VISIT" || action.type === "FOLLOW") && action.url) window.open(action.url, "_blank", "noopener");
      if (action.type === "COUPON") finish();
    });
  }

  function finish() {
    start(async () => {
      const payload =
        action.type === "FORM"
          ? { name: form.name, email: form.email, phone: form.phone, answer: form.answer, consent: String(form.consent) }
          : undefined;
      const r = await completeActionAction(action.id, payload);
      setResult(r);
      if (r.ok) {
        setPhase("done");
        router.refresh();
      }
    });
  }

  if (phase === "done") {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800" data-testid={`action-done-${action.id}`}>
        ✅ {action.label} — completado
        {result?.message && <p className="mt-1 font-semibold">{result.message}</p>}
        {(result?.coupon || action.coupon) && (
          <p className="mt-2">
            Tu cupón: <code className="rounded bg-white px-2 py-1 font-mono font-bold text-violet-800">{result?.coupon ?? action.coupon}</code>
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={`rounded-xl border p-3 ${action.isUnlock ? "border-violet-300 bg-violet-50" : "border-violet-100 bg-white"}`}>
      {phase === "idle" && (
        <button
          onClick={begin}
          disabled={pending}
          className={action.isUnlock ? "btn-primary w-full py-3 text-base" : "btn-ghost w-full justify-between"}
          data-testid={action.isUnlock ? "unlock-button" : `action-${action.id}`}
        >
          <span>
            {action.isUnlock ? "🔓 Desbloquear: " : `${ICON[action.type]} `}
            {action.label}
          </span>
          {!action.isUnlock && (capReached ? <span className="badge bg-violet-100 text-violet-600">Máx. papeletas</span> : <span className="badge bg-amber-100 text-amber-900">+1 🎟️</span>)}
        </button>
      )}

      {phase === "running" && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-violet-900">
            {ICON[action.type]} {action.label}
          </p>
          {action.type === "VIDEO" &&
            (action.embedUrl ? (
              <div className="aspect-video overflow-hidden rounded-lg bg-black">
                <iframe src={action.embedUrl} className="h-full w-full" allow="autoplay; encrypted-media" allowFullScreen title={action.label} />
              </div>
            ) : (
              action.url && (
                <a href={action.url} target="_blank" rel="noopener" className="btn-ghost w-full">
                  Abrir vídeo de {sponsorName} ↗
                </a>
              )
            ))}
          {(action.type === "VISIT" || action.type === "FOLLOW") && action.url && (
            <p className="text-sm text-violet-700">
              Se ha abierto {action.type === "VISIT" ? "la web" : "el perfil"} de {sponsorName}.{" "}
              <a href={action.url} target="_blank" rel="noopener" className="font-semibold underline">
                ¿No se abrió? Pulsa aquí
              </a>
            </p>
          )}
          {action.type === "FORM" && (
            <div className="grid gap-2">
              <input className="input" placeholder="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="lead-name" />
              <input className="input" placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} data-testid="lead-email" />
              <input className="input" placeholder="Teléfono (opcional)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              {action.formQuestion && (
                <input className="input" placeholder={action.formQuestion} value={form.answer} onChange={(e) => setForm({ ...form, answer: e.target.value })} />
              )}
              <label className="flex items-start gap-2 text-xs text-violet-700">
                <input type="checkbox" checked={form.consent} onChange={(e) => setForm({ ...form, consent: e.target.checked })} data-testid="lead-consent" />
                Acepto que Sorteo Diario ceda estos datos a {sponsorName} para que me contacte con información comercial.
              </label>
            </div>
          )}
          {action.type !== "COUPON" && (
            <button onClick={finish} disabled={pending || remaining > 0} className="btn-accent w-full" data-testid="complete-action">
              {remaining > 0
                ? `Espera ${remaining} s…`
                : action.type === "VIDEO"
                  ? "✅ He visto el vídeo"
                  : action.type === "VISIT"
                    ? "✅ Ya he visitado la web"
                    : action.type === "FOLLOW"
                      ? "✅ Ya le sigo"
                      : "Enviar"}
            </button>
          )}
        </div>
      )}
      {result && !result.ok && <p className="mt-2 text-sm text-rose-600" role="alert">{result.message}</p>}
    </div>
  );
}
