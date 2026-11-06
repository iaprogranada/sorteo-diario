import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { registerAction } from "@/app/actions/auth";

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ ref?: string; tipo?: string }> }) {
  const { ref, tipo } = await searchParams;
  const sponsor = tipo === "patrocinador";
  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <div className="card p-6">
        <div className="mb-4 flex rounded-xl bg-violet-50 p-1 text-sm font-semibold">
          <Link href="/registro" className={`flex-1 rounded-lg py-2 text-center ${!sponsor ? "bg-white text-violet-900 shadow-sm" : "text-violet-500"}`}>Quiero participar</Link>
          <Link href="/registro?tipo=patrocinador" className={`flex-1 rounded-lg py-2 text-center ${sponsor ? "bg-white text-violet-900 shadow-sm" : "text-violet-500"}`}>Soy patrocinador</Link>
        </div>
        <h1 className="h1">{sponsor ? "Alta de patrocinador" : "Crea tu cuenta gratis"}</h1>
        <p className="mt-1 text-sm text-violet-600">
          {sponsor ? "Sortea tus productos o servicios y consigue visitas, visualizaciones y clientes." : "Te regalamos 10 comodines al verificar tu teléfono."}
        </p>
        {ref && !sponsor && <p className="mt-3 rounded-lg bg-amber-50 p-2 text-sm text-amber-900">🎁 Vienes invitado por un amigo (código {ref}).</p>}
        <ActionForm action={registerAction} className="mt-6 space-y-4">
          <input type="hidden" name="kind" value={sponsor ? "sponsor" : "user"} />
          {ref && <input type="hidden" name="ref" value={ref} />}
          {sponsor && (
            <>
              <div>
                <label className="label" htmlFor="companyName">Nombre de la empresa o marca</label>
                <input id="companyName" name="companyName" required className="input" />
              </div>
              <div>
                <label className="label" htmlFor="website">Web (opcional)</label>
                <input id="website" name="website" type="url" placeholder="https://" className="input" />
              </div>
            </>
          )}
          <div>
            <label className="label" htmlFor="name">{sponsor ? "Persona de contacto" : "Nombre y apellidos"}</label>
            <input id="name" name="name" required className="input" autoComplete="name" />
          </div>
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" name="email" type="email" required className="input" autoComplete="email" />
          </div>
          <div>
            <label className="label" htmlFor="phone">Teléfono móvil {sponsor && "(opcional)"}</label>
            <input id="phone" name="phone" type="tel" required={!sponsor} placeholder="600 000 000" className="input" autoComplete="tel" />
            {!sponsor && <p className="mt-1 text-xs text-violet-500">Te enviaremos un código por SMS. Una cuenta por persona.</p>}
          </div>
          <div>
            <label className="label" htmlFor="password">Contraseña</label>
            <input id="password" name="password" type="password" required minLength={8} className="input" autoComplete="new-password" />
          </div>
          <label className="flex items-start gap-2 text-sm text-violet-800">
            <input type="checkbox" name="adult" className="mt-1" /> Soy mayor de 18 años y resido en España
          </label>
          <label className="flex items-start gap-2 text-sm text-violet-800">
            <input type="checkbox" name="terms" className="mt-1" /> Acepto las <Link href="/legal/bases" className="underline" target="_blank">bases legales</Link> y la <Link href="/legal/privacidad" className="underline" target="_blank">política de privacidad</Link>
          </label>
          <SubmitButton className="btn-primary w-full">{sponsor ? "Crear cuenta de patrocinador" : "Crear mi cuenta"}</SubmitButton>
        </ActionForm>
        <p className="mt-4 text-center text-sm text-violet-600">
          ¿Ya tienes cuenta? <Link href="/entrar" className="font-semibold underline">Entrar</Link>
        </p>
      </div>
    </main>
  );
}
