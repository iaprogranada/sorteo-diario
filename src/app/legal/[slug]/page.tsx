import { notFound } from "next/navigation";
import { getSettings } from "@/lib/settings";

export default async function LegalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const s = await getSettings();
  const pages: Record<string, { title: string; body: string[] }> = {
    bases: {
      title: "Bases legales generales de los sorteos",
      body: [
        "1. Organizador. Sorteo Diario (IA Pro) [DATOS FISCALES: razón social, NIF y domicilio], en colaboración con el patrocinador indicado en cada sorteo.",
        "2. Gratuidad. La participación es totalmente gratuita. No se exige compra ni pago alguno. Se trata de una combinación aleatoria con fines publicitarios.",
        "3. Ámbito y participantes. Personas físicas mayores de 18 años residentes en España, con una única cuenta verificada por teléfono. Quedan excluidos los empleados del patrocinador.",
        `4. Mecánica. Cada participante consigue papeletas numeradas de forma correlativa al completar acciones del patrocinador o al usar comodines gratuitos. Máximo ${s.maxTicketsRegular} papeletas por persona en los sorteos regulares y ${s.maxTicketsSpecial} en los especiales.`,
        "5. Fechas. Cada sorteo indica su fecha y hora de inicio y de cierre (hora peninsular española).",
        "6. Elección del ganador. Al crear el sorteo se publica la huella SHA-256 de una clave secreta. Al cierre se usa la primera ronda pública de drand posterior al cierre y se calcula HMAC-SHA256(clave, aleatoriedad:contador) módulo número de papeletas + 1. Se eligen además 2 suplentes. El proceso es verificable públicamente.",
        `7. Comunicación y aceptación. El ganador será avisado por email y en la plataforma y dispondrá de ${s.claimDays} días para aceptar el premio. En caso contrario el premio pasará al suplente.`,
        `8. Premio. El indicado en cada sorteo, con valor inferior a ${s.maxPrizeValue} €. No canjeable por dinero. La entrega corresponde al patrocinador.`,
        "9. Fraude. Se anularán las participaciones de cuentas duplicadas, automatizadas o que incumplan estas bases.",
        "10. Protección de datos. Ver la política de privacidad. Los datos solo se ceden al patrocinador cuando el participante lo consiente expresamente.",
        "11. Fiscalidad. [Revisar con asesor fiscal la obligación de retención o ingreso a cuenta según el valor del premio.]",
      ],
    },
    privacidad: {
      title: "Política de privacidad",
      body: [
        "Responsable: Sorteo Diario (IA Pro) [DATOS].",
        "Finalidad: gestionar tu cuenta, tu participación en los sorteos, la comunicación de premios y, si lo consientes, la cesión de tus datos al patrocinador concreto.",
        "Legitimación: ejecución de las bases aceptadas y tu consentimiento expreso para cesiones.",
        "Conservación: mientras mantengas tu cuenta y los plazos legales aplicables.",
        "Derechos: acceso, rectificación, supresión, oposición, limitación y portabilidad escribiendo a [EMAIL]. Puedes reclamar ante la AEPD.",
      ],
    },
    cookies: {
      title: "Política de cookies",
      body: [
        "Usamos cookies técnicas necesarias para mantener tu sesión (sd_session) y prevenir el fraude (sd_device).",
        "Si en el futuro se usan cookies analíticas o publicitarias, se pedirá tu consentimiento previo.",
      ],
    },
    "aviso-legal": {
      title: "Aviso legal",
      body: ["Titular del sitio web: [RAZÓN SOCIAL], NIF [NIF], domicilio [DOMICILIO], email [EMAIL].", "Condiciones de uso: el usuario se compromete a hacer un uso lícito de la plataforma."],
    },
  };
  const page = pages[slug];
  if (!page) notFound();
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <p className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">⚠️ Borrador de plantilla. Debe revisarlo un abogado antes del lanzamiento.</p>
      <h1 className="h1">{page.title}</h1>
      <div className="card mt-4 space-y-3 p-6 text-sm leading-relaxed text-violet-900">
        {page.body.map((p) => <p key={p}>{p}</p>)}
      </div>
    </main>
  );
}
