"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";

export type FormState = { error?: string; ok?: string } | null;

export function SubmitButton({ children, className = "btn-primary", pendingText = "Un momento…" }: { children: React.ReactNode; className?: string; pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending}>
      {pending ? pendingText : children}
    </button>
  );
}

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
  const [state, formAction] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (resetOnOk && state?.ok) ref.current?.reset();
  }, [state, resetOnOk]);
  return (
    <form ref={ref} action={formAction} className={className}>
      {children}
      {state?.error && <p className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">{state.error}</p>}
      {state?.ok && <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700" role="status">{state.ok}</p>}
    </form>
  );
}
