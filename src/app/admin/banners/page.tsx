import { prisma } from "@/lib/db";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { createBannerAction, toggleBannerAction, deleteBannerAction } from "@/app/actions/admin";

const POS = { LEFT: "Lateral izquierdo", RIGHT: "Lateral derecho", FOOTER: "Faldón inferior" };

export default async function AdminBanners() {
  const banners = await prisma.adBanner.findMany({ orderBy: { createdAt: "desc" } });
  return (
    <div className="space-y-6">
      <h1 className="h1">Banners publicitarios</h1>
      <p className="text-violet-700">Marcas que quieren aparecer sin sortear. Si añades un vídeo, también sale en “Gana comodines”.</p>
      <div className="card overflow-x-auto">
        <table className="table">
          <thead><tr><th>Anuncio</th><th>Posición</th><th>Impresiones</th><th>Clics</th><th>CTR</th><th>Vídeo</th><th></th></tr></thead>
          <tbody>
            {banners.map((b) => (
              <tr key={b.id} className={b.active ? "" : "opacity-50"}>
                <td><span className="mr-1">{b.emoji}</span><b>{b.title}</b><p className="text-xs text-violet-500">{b.advertiser}</p></td>
                <td>{POS[b.position]}</td>
                <td>{b.impressions}</td>
                <td>{b.clicks}</td>
                <td>{b.impressions ? ((b.clicks / b.impressions) * 100).toFixed(1) : "0.0"} %</td>
                <td>{b.videoUrl ? `${b.videoSeconds} s` : "—"}</td>
                <td className="whitespace-nowrap">
                  <form action={toggleBannerAction} className="inline"><input type="hidden" name="id" value={b.id} /><button className="text-xs font-semibold text-violet-600 hover:underline">{b.active ? "Pausar" : "Activar"}</button></form>
                  <form action={deleteBannerAction} className="ml-2 inline"><input type="hidden" name="id" value={b.id} /><button className="text-xs font-semibold text-rose-600 hover:underline">Borrar</button></form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <section className="card max-w-3xl p-5">
        <h2 className="h2">Nuevo banner</h2>
        <ActionForm action={createBannerAction} className="mt-3 grid gap-3 sm:grid-cols-2" resetOnOk>
          <input name="advertiser" placeholder="Anunciante" className="input" required />
          <input name="title" placeholder="Titular" className="input" required />
          <input name="text" placeholder="Texto corto (opcional)" className="input sm:col-span-2" />
          <input name="linkUrl" placeholder="Enlace de destino https://" className="input" required />
          <input name="imageUrl" placeholder="Imagen (URL, opcional)" className="input" />
          <input name="videoUrl" placeholder="Vídeo YouTube (opcional)" className="input" />
          <input name="videoSeconds" type="number" defaultValue={15} className="input" title="Segundos del vídeo" />
          <select name="position" className="input">
            {Object.entries(POS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <div className="flex gap-2">
            <input name="emoji" defaultValue="📣" className="input w-20" />
            <input name="color" type="color" defaultValue="#6d28d9" className="h-10 w-16 rounded-lg" />
          </div>
          <div className="sm:col-span-2"><SubmitButton>Crear banner</SubmitButton></div>
        </ActionForm>
      </section>
    </div>
  );
}
