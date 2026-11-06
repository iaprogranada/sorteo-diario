import Link from "next/link";

export default function Advertise() {
  return (
    <main className="mx-auto max-w-4xl space-y-8 px-4 py-10">
      <div className="rounded-3xl bg-gradient-to-br from-violet-700 to-fuchsia-500 p-8 text-white">
        <h1 className="text-3xl font-black">Haz que miles de personas conozcan tu marca</h1>
        <p className="mt-2 max-w-2xl text-violet-100">Sortea un producto o servicio y tú decides qué hacen los participantes: ver tu vídeo, visitar tu web, seguirte o dejarte sus datos.</p>
        <Link href="/registro?tipo=patrocinador" className="btn-accent mt-5 px-6 py-3 text-base">Quiero patrocinar un sorteo</Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          ["▶️", "Visualizaciones", "Tu vídeo visto completo, con el tiempo controlado."],
          ["🌐", "Visitas", "Tráfico real a tu web, landing o tienda."],
          ["📝", "Leads", "Contactos con consentimiento, descargables en CSV."],
        ].map(([i, t, d]) => (
          <div key={t} className="card p-5"><span className="text-3xl">{i}</span><p className="mt-2 font-bold">{t}</p><p className="text-sm text-violet-700">{d}</p></div>
        ))}
      </div>
      <section className="card p-6">
        <h2 className="h2">📣 ¿Solo quieres aparecer?</h2>
        <p className="mt-1 text-sm text-violet-700">También ofrecemos banners en los laterales y en el faldón de la web, y vídeos patrocinados en la sección “Gana comodines”. Escríbenos y te preparamos una propuesta.</p>
      </section>
    </main>
  );
}
