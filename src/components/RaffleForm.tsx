"use client";

import { useState } from "react";
import { ActionForm, SubmitButton } from "./ActionForm";
import { createRaffleAction } from "@/app/actions/sponsor";

type A = { type: "VIDEO" | "VISIT" | "FOLLOW" | "FORM" | "COUPON"; label: string; url: string; seconds: number; couponCode: string; formQuestion: string };

const TYPES: { v: A["type"]; t: string; hint: string }[] = [
  { v: "VIDEO", t: "▶️ Ver un vídeo", hint: "Enlace de YouTube y segundos mínimos (5–60)" },
  { v: "VISIT", t: "🌐 Visitar web o landing", hint: "El usuario visita tu web unos segundos" },
  { v: "FOLLOW", t: "➕ Seguir en redes", hint: "Enlace a tu perfil de Instagram, TikTok…" },
  { v: "FORM", t: "📝 Dejar sus datos (lead)", hint: "Nombre, email y teléfono con consentimiento" },
  { v: "COUPON", t: "🏷️ Mostrar un cupón", hint: "Un código de descuento para tu tienda" },
];

const empty = (type: A["type"] = "VISIT"): A => ({ type, label: "", url: "", seconds: type === "VIDEO" ? 20 : 5, couponCode: "", formQuestion: "" });

export function RaffleForm({
  categories,
  durations,
  specialMaxHours,
  maxPrizeValue,
  maxExtra,
  defaultStart,
  isAdmin,
}: {
  categories: string[];
  durations: number[];
  specialMaxHours: number;
  maxPrizeValue: number;
  maxExtra: number;
  defaultStart: string;
  isAdmin: boolean;
}) {
  const [type, setType] = useState<"REGULAR" | "SPECIAL" | "PREMIUM">("REGULAR");
  const [delivery, setDelivery] = useState("DIGITAL");
  const [actions, setActions] = useState<A[]>([empty("VIDEO")]);
  const update = (i: number, patch: Partial<A>) => setActions((xs) => xs.map((a, j) => (j === i ? { ...a, ...patch } : a)));

  return (
    <ActionForm action={createRaffleAction} className="space-y-6">
      <input type="hidden" name="actions" value={JSON.stringify(actions)} />
      <section className="card space-y-4 p-5">
        <h2 className="h2">1. El premio</h2>
        <div>
          <label className="label">Título del sorteo</label>
          <input name="title" required className="input" placeholder="Ej.: Masaje relajante de 60 minutos" />
        </div>
        <div>
          <label className="label">Descripción</label>
          <textarea name="description" required rows={3} className="input" placeholder="Qué incluye, condiciones, validez…" />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label">Valor (€)</label>
            <input name="prizeValue" type="number" step="0.01" min="1" required className="input" />
            {type !== "PREMIUM" && <p className="mt-1 text-xs text-violet-500">Inferior a {maxPrizeValue} €</p>}
          </div>
          <div>
            <label className="label">Categoría</label>
            <select name="category" className="input">
              {categories.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Emoji</label>
            <input name="emoji" defaultValue="🎁" className="input" maxLength={8} />
          </div>
        </div>
        <div>
          <label className="label">Foto del premio (URL, opcional)</label>
          <input name="imageUrl" type="url" className="input" placeholder="https://…/foto.jpg" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Tipo de entrega</label>
            <select name="deliveryType" className="input" value={delivery} onChange={(e) => setDelivery(e.target.value)}>
              <option value="DIGITAL">Cupón / bono digital</option>
              <option value="SHIPPING">Lo envío a casa del ganador</option>
              <option value="IN_PERSON">Se disfruta en mi local</option>
            </select>
          </div>
          {delivery === "IN_PERSON" && (
            <div>
              <label className="label">Ciudad</label>
              <input name="city" required className="input" />
            </div>
          )}
        </div>
      </section>

      <section className="card space-y-4 p-5">
        <h2 className="h2">2. Duración</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label">Tipo de sorteo</label>
            <select name="type" className="input" value={type} onChange={(e) => setType(e.target.value as typeof type)}>
              <option value="REGULAR">Regular (máx. 10 papeletas/persona)</option>
              <option value="SPECIAL">Especial (máx. 30 papeletas/persona)</option>
              {isAdmin && <option value="PREMIUM">Premium (ilimitadas)</option>}
            </select>
          </div>
          <div>
            <label className="label">Duración</label>
            {type === "REGULAR" ? (
              <select name="durationHours" className="input">
                {durations.map((h) => <option key={h} value={h}>{h} horas</option>)}
              </select>
            ) : (
              <select name="durationHours" className="input" defaultValue={specialMaxHours}>
                {Array.from({ length: Math.floor((type === "PREMIUM" ? 30 * 24 : specialMaxHours) / 24) }, (_, i) => (i + 1) * 24).map((h) => (
                  <option key={h} value={h}>{h / 24} día{h > 24 ? "s" : ""}</option>
                ))}
              </select>
            )}
          </div>
          <div>
            <label className="label">Empieza</label>
            <input name="startAt" type="datetime-local" defaultValue={defaultStart} className="input" required />
            <p className="mt-1 text-xs text-violet-500">Los sorteos se publican a las 8:00</p>
          </div>
        </div>
        <div className="sm:w-1/3">
          <label className="label">Tope de papeletas totales (opcional)</label>
          <input name="maxTotalTickets" type="number" min="10" className="input" placeholder="Sin tope" />
          <p className="mt-1 text-xs text-violet-500">Si se agotan, el sorteo cierra antes.</p>
        </div>
      </section>

      <section className="card space-y-4 p-5">
        <div>
          <h2 className="h2">3. Acciones del usuario</h2>
          <p className="text-sm text-violet-600">
            La primera es la acción para <b>desbloquear</b> (da 3 papeletas). Puedes añadir hasta {maxExtra} acciones extra (+1 papeleta cada una).
          </p>
        </div>
        {actions.map((a, i) => (
          <div key={i} className={`space-y-3 rounded-xl border p-4 ${i === 0 ? "border-violet-300 bg-violet-50" : "border-violet-100"}`} data-testid={`action-editor-${i}`}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-violet-900">{i === 0 ? "🔓 Acción para desbloquear" : `Acción extra ${i}`}</p>
              {i > 0 && (
                <button type="button" className="text-xs text-rose-600 hover:underline" onClick={() => setActions((xs) => xs.filter((_, j) => j !== i))}>
                  Quitar
                </button>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <select className="input" value={a.type} onChange={(e) => update(i, { ...empty(e.target.value as A["type"]), label: a.label })} data-testid={`action-type-${i}`}>
                {TYPES.map((t) => <option key={t.v} value={t.v}>{t.t}</option>)}
              </select>
              <input className="input" placeholder="Texto del botón (ej.: Mira nuestro spa)" value={a.label} onChange={(e) => update(i, { label: e.target.value })} data-testid={`action-label-${i}`} />
            </div>
            <p className="text-xs text-violet-500">{TYPES.find((t) => t.v === a.type)?.hint}</p>
            {(a.type === "VIDEO" || a.type === "VISIT" || a.type === "FOLLOW") && (
              <div className="grid gap-3 sm:grid-cols-3">
                <input className="input sm:col-span-2" placeholder="https://" value={a.url} onChange={(e) => update(i, { url: e.target.value })} data-testid={`action-url-${i}`} />
                {a.type !== "FOLLOW" && (
                  <input className="input" type="number" min={a.type === "VIDEO" ? 5 : 3} max={60} value={a.seconds} onChange={(e) => update(i, { seconds: Number(e.target.value) })} title="Segundos" />
                )}
              </div>
            )}
            {a.type === "COUPON" && <input className="input" placeholder="Código del cupón" value={a.couponCode} onChange={(e) => update(i, { couponCode: e.target.value })} />}
            {a.type === "FORM" && <input className="input" placeholder="Pregunta opcional (ej.: ¿Qué tipo de negocio tienes?)" value={a.formQuestion} onChange={(e) => update(i, { formQuestion: e.target.value })} />}
          </div>
        ))}
        {actions.length - 1 < maxExtra && (
          <button type="button" className="btn-ghost" onClick={() => setActions((xs) => [...xs, empty()])} data-testid="add-action">
            + Añadir acción extra
          </button>
        )}
      </section>

      <SubmitButton className="btn-primary w-full py-3 text-base">{isAdmin ? "Crear y publicar sorteo" : "Enviar a revisión"}</SubmitButton>
    </ActionForm>
  );
}
