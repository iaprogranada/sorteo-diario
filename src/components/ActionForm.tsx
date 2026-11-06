"use client";

import { createContext, startTransition, useActionState, useContext, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";

export type FormState = { error?: string; ok?: string } | null;

const PendingCtx = createContext(false);

export function SubmitButton({ children, className = "btn-primary", pendingText = "Un momento…" }: { children: React.ReactNode; className?: string; pendingText?: string }) {
  const status = useFormStatus();
  const pending = useContext(PendingCtx) || status.pending;
  return (
    <button type="submit" className={className} disabled={pending}>
      {pending ? pendingText : children}
    </button>
  );
}

/**
 * Formulario con acción de servidor que NO borra lo escrito si hay un error
 * (React 19 resetea los formularios por defecto tras una acción).
 */
export function ActionForm({
  action,
  children,
  className,
  resetOnOk = false,
}: {
  action: (state: FormState, fd: FormData) => Promise<FormState>;
  children: React.ReactNode;
  className?: string;
  resetOnOk?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (resetOnOk && state?.ok) ref.current?.reset();
  }, [state, resetOnOk]);
  return (
    <PendingCtx.Provider value={pending}>
      <form
        ref={ref}
        className={className}
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          startTransition(() => formAction(fd));
        }}
      >
        {children}
        {state?.error && <p className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">{state.error}</p>}
        {state?.ok && <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700" role="status">{state.ok}</p>}
      </form>
    </PendingCtx.Provider>
  );
}
