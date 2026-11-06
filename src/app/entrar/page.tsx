import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { loginAction } from "@/app/actions/auth";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <div className="card p-6">
        <h1 className="h1">Entrar</h1>
        <p className="mt-1 text-sm text-violet-600">Accede a tu cuenta de Sorteo Diario.</p>
        <ActionForm action={loginAction} className="mt-6 space-y-4">
          <input type="hidden" name="next" value={next ?? ""} />
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" name="email" type="email" required className="input" autoComplete="email" />
          </div>
          <div>
            <label className="label" htmlFor="password">Contraseña</label>
            <input id="password" name="password" type="password" required className="input" autoComplete="current-password" />
          </div>
          <SubmitButton className="btn-primary w-full">Entrar</SubmitButton>
        </ActionForm>
        <p className="mt-4 text-center text-sm text-violet-600">
          ¿No tienes cuenta? <Link href={`/registro${next ? `?next=${next}` : ""}`} className="font-semibold underline">Regístrate gratis</Link>
        </p>
      </div>
    </main>
  );
}
