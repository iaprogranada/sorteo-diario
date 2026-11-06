import { getSettings, type RewardReason } from "@/lib/settings";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { saveSettingsAction } from "@/app/actions/admin";

export default async function AdminSettings() {
  const s = await getSettings();
  const field = (name: string, label: string, value: number | string, hint?: string) => (
    <div>
      <label className="label" htmlFor={name}>{label}</label>
      <input id={name} name={name} defaultValue={value} className="input" />
      {hint && <p className="mt-1 text-xs text-violet-500">{hint}</p>}
    </div>
  );
  return (
    <div className="max-w-4xl">
      <h1 className="h1">Ajustes de la plataforma</h1>
      <p className="mt-1 text-violet-700">Cambia topes y recompensas sin tocar código. Se aplican al momento.</p>
      <ActionForm action={saveSettingsAction} className="mt-6 space-y-6">
        <section className="card grid gap-4 p-5 sm:grid-cols-3">
          <h2 className="h2 sm:col-span-3">🎟️ Papeletas por persona y sorteo</h2>
          {field("maxTicketsRegular", "Regular", s.maxTicketsRegular)}
          {field("maxTicketsSpecial", "Especial", s.maxTicketsSpecial)}
          {field("maxTicketsPremium", "Premium", s.maxTicketsPremium, "0 = ilimitadas")}
          {field("unlockTickets", "Papeletas al desbloquear", s.unlockTickets)}
          {field("extraActionTickets", "Papeletas por acción extra", s.extraActionTickets)}
          {field("maxExtraActions", "Máx. acciones extra por sorteo", s.maxExtraActions)}
        </section>
        <section className="card grid gap-4 p-5 sm:grid-cols-3">
          <h2 className="h2 sm:col-span-3">🎁 Sorteos</h2>
          {field("maxPrizeValue", "Valor del premio inferior a (€)", s.maxPrizeValue, "No aplica a premium")}
          {field("regularDurations", "Duraciones regulares (horas)", s.regularDurations.join(", "))}
          {field("specialMaxDays", "Máx. días sorteo especial", s.specialMaxHours / 24)}
          {field("claimDays", "Días para aceptar el premio", s.claimDays)}
        </section>
        <section className="card p-5">
          <h2 className="h2">🃏 Comodines</h2>
          <div className="mt-3 sm:w-1/3">{field("dailyWildcardCap", "Tope diario de comodines", s.dailyWildcardCap, "Bienvenida y perfil no cuentan")}</div>
          <table className="table mt-4">
            <thead><tr><th>Tarea</th><th>Comodines</th><th>Límite al día</th></tr></thead>
            <tbody>
              {(Object.keys(s.rewards) as RewardReason[]).map((k) => (
                <tr key={k}>
                  <td>{s.rewards[k].label}{s.rewards[k].once && <span className="text-xs text-violet-400"> (una vez)</span>}</td>
                  <td><input name={`r_${k}_amount`} defaultValue={s.rewards[k].amount} className="input w-24" /></td>
                  <td>{s.rewards[k].dailyLimit !== undefined ? <input name={`r_${k}_limit`} defaultValue={s.rewards[k].dailyLimit} className="input w-24" /> : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <SubmitButton>Guardar ajustes</SubmitButton>
      </ActionForm>
    </div>
  );
}
