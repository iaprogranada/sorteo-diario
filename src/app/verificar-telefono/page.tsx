import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { verifyPhoneAction } from "@/app/actions/auth";

export default async function VerifyPhonePage() {
  const user = await requireUser();
  if (user.phoneVerified) redirect("/");
  const mock = process.env.SMS_MODE !== "live";
  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <div className="card p-6">
        <h1 className="h1">Verifica tu teléfono</h1>
        <p className="mt-1 text-sm text-violet-600">
          Hemos enviado un código de 6 cifras al <b>{user.phone}</b>. Así garantizamos una cuenta por persona y sorteos justos.
        </p>
        {mock && (
          <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900" data-testid="mock-sms">
            🧪 Modo pruebas: no se envían SMS reales. Tu código es <b>{user.phoneCode}</b>
          </p>
        )}
        <ActionForm action={verifyPhoneAction} className="mt-6 space-y-4">
          <div>
            <label className="label" htmlFor="code">Código</label>
            <input id="code" name="code" inputMode="numeric" maxLength={6} required className="input text-center text-2xl tracking-[0.5em]" />
          </div>
          <SubmitButton className="btn-primary w-full">Verificar y recibir mis comodines</SubmitButton>
        </ActionForm>
      </div>
    </main>
  );
}
