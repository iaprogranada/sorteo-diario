import Link from "next/link";
import { requireSponsor } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { now as clockNow } from "@/lib/clock";
import { nextPublishTime, toLocalInput } from "@/lib/time";
import { CATEGORIES } from "@/lib/raffles";
import { RaffleForm } from "@/components/RaffleForm";

export default async function NewRafflePage() {
  const user = await requireSponsor();
  const [s, now] = await Promise.all([getSettings(), clockNow()]);
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/patrocinador" className="text-sm font-medium text-violet-600 hover:underline">← Mis sorteos</Link>
      <h1 className="h1 mt-2">Nuevo sorteo</h1>
      <p className="mb-6 text-violet-700">Tú pones el premio y eliges qué tiene que hacer la gente para participar. Nosotros lo revisamos y lo publicamos.</p>
      <RaffleForm
        categories={CATEGORIES}
        durations={s.regularDurations}
        specialMaxHours={s.specialMaxHours}
        maxPrizeValue={s.maxPrizeValue}
        maxExtra={s.maxExtraActions}
        defaultStart={toLocalInput(nextPublishTime(now, s.publishHour))}
        isAdmin={user.role === "ADMIN"}
      />
    </main>
  );
}
