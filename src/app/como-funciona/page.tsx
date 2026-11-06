import Link from "next/link";
import { getSettings } from "@/lib/settings";

export default async function HowItWorks() {
  const s = await getSettings();
  const steps = [
    ["📝", "Regístrate gratis", `Verifica tu móvil y te regalamos ${s.rewards.WELCOME.amount} comodines.`],
    ["🎁", "Elige un sorteo", "Cada día se publican sorteos nuevos de marcas y negocios: cenas, masajes, tecnología, viajes…"],
    ["🔓", "Desbloquéalo", `Haz la acción del patrocinador (ver un vídeo, visitar su web…) y llévate ${s.unlockTickets} papeletas.`],
    ["🎟️", "Suma papeletas", `Completa acciones extra (+${s.extraActionTickets} cada una) y añade comodines. Máximo ${s.maxTicketsRegular} por sorteo (${s.maxTicketsSpecial} en los especiales).`],
    ["🏆", "Sorteo verificable", "Al cerrar, un número aleatorio público elige la papeleta ganadora. Cualquiera puede comprobarlo."],
  ];
  return (
    <main className="mx-auto max-w-4xl space-y-8 px-4 py-10">
      <div className="text-center">
        <h1 className="h1">¿Cómo funciona Sorteo Diario?</h1>
        <p className="mt-2 text-violet-700">Participar es 100 % gratis. Los premios los ponen los patrocinadores a cambio de que conozcas su marca.</p>
      </div>
      <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {steps.map(([icon, t, d], i) => (
          <li key={t} className="card p-5">
            <span className="text-3xl">{icon}</span>
            <p className="mt-2 font-bold text-violet-950">{i + 1}. {t}</p>
            <p className="text-sm text-violet-700">{d}</p>
          </li>
        ))}
      </ol>
      <section className="card p-6">
        <h2 className="h2">🃏 ¿Qué son los comodines?</h2>
        <p className="mt-1 text-sm text-violet-700">Papeletas libres que ganas entrando cada día, invitando a amigos, compartiendo sorteos o viendo vídeos de anunciantes. Los pones en el sorteo que más te guste. Puedes ganar hasta {s.dailyWildcardCap} al día.</p>
      </section>
      <section className="card p-6">
        <h2 className="h2">❓ Preguntas frecuentes</h2>
        <dl className="mt-3 space-y-3 text-sm">
          <div><dt className="font-semibold">¿Tengo que pagar algo?</dt><dd className="text-violet-700">No. Nunca. Participar es totalmente gratuito.</dd></div>
          <div><dt className="font-semibold">¿Cómo sé que no está amañado?</dt><dd className="text-violet-700">Cada sorteo publica una huella antes de empezar y usa un número aleatorio público (drand) al cerrar. En la página de verificación puedes recalcularlo tú mismo.</dd></div>
          <div><dt className="font-semibold">¿Qué pasa si gano?</dt><dd className="text-violet-700">Te avisamos y tienes {s.claimDays} días para aceptar el premio. Si no, pasa al suplente.</dd></div>
        </dl>
      </section>
      <div className="text-center"><Link href="/registro" className="btn-primary px-8 py-3 text-base">Empezar gratis</Link></div>
    </main>
  );
}
