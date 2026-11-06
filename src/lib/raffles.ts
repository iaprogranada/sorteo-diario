import { prisma } from "./db";
import type { Prisma } from "@prisma/client";

export const raffleCardInclude = {
  sponsor: { select: { companyName: true, logoEmoji: true } },
  _count: { select: { tickets: true } },
} satisfies Prisma.RaffleInclude;

export type RaffleCardData = Prisma.RaffleGetPayload<{ include: typeof raffleCardInclude }>;

export function liveWhere(now: Date): Prisma.RaffleWhereInput {
  return { status: "APPROVED", startAt: { lte: now }, endAt: { gt: now } };
}

export async function liveRaffles(now: Date) {
  return prisma.raffle.findMany({ where: liveWhere(now), include: raffleCardInclude, orderBy: { endAt: "asc" } });
}

export type RaffleState = "pending" | "scheduled" | "live" | "drawing" | "closed" | "rejected" | "cancelled";

export function raffleState(r: { status: string; startAt: Date; endAt: Date }, now: Date): RaffleState {
  if (r.status === "PENDING") return "pending";
  if (r.status === "REJECTED") return "rejected";
  if (r.status === "CANCELLED") return "cancelled";
  if (r.status === "CLOSED") return "closed";
  if (r.startAt > now) return "scheduled";
  if (r.endAt > now) return "live";
  return "drawing";
}

export const STATE_LABEL: Record<RaffleState, string> = {
  pending: "Pendiente de aprobación",
  scheduled: "Programado",
  live: "Abierto",
  drawing: "Sorteando…",
  closed: "Finalizado",
  rejected: "Rechazado",
  cancelled: "Cancelado",
};

export const TYPE_LABEL = { REGULAR: "Regular", SPECIAL: "Especial", PREMIUM: "Premium" } as const;
export const DELIVERY_LABEL = { DIGITAL: "Cupón digital", SHIPPING: "Envío a casa", IN_PERSON: "Para disfrutar en" } as const;
export const ACTION_LABEL = {
  VIDEO: "Ver vídeo",
  VISIT: "Visitar web",
  FOLLOW: "Seguir en redes",
  FORM: "Dejar tus datos",
  COUPON: "Ver cupón descuento",
} as const;

export const CATEGORIES = [
  "Belleza y estética",
  "Bienestar y masajes",
  "Restaurantes",
  "Moda",
  "Tecnología y gaming",
  "Deporte",
  "Libros y formación",
  "Ocio y experiencias",
  "Viajes y hoteles",
  "Hogar",
  "Otros",
];

export const PROVINCES = [
  "A Coruña","Álava","Albacete","Alicante","Almería","Asturias","Ávila","Badajoz","Baleares","Barcelona","Burgos","Cáceres","Cádiz","Cantabria","Castellón","Ceuta","Ciudad Real","Córdoba","Cuenca","Girona","Granada","Guadalajara","Gipuzkoa","Huelva","Huesca","Jaén","La Rioja","Las Palmas","León","Lleida","Lugo","Madrid","Málaga","Melilla","Murcia","Navarra","Ourense","Palencia","Pontevedra","Salamanca","Santa Cruz de Tenerife","Segovia","Sevilla","Soria","Tarragona","Teruel","Toledo","Valencia","Valladolid","Bizkaia","Zamora","Zaragoza",
];

/** Gradiente estable por categoría para las tarjetas sin foto */
export function gradientFor(seed: string) {
  const palettes = [
    "from-fuchsia-500 to-violet-600",
    "from-amber-400 to-orange-500",
    "from-emerald-400 to-teal-600",
    "from-sky-400 to-indigo-600",
    "from-rose-400 to-pink-600",
    "from-lime-400 to-green-600",
    "from-violet-500 to-purple-700",
  ];
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return palettes[h % palettes.length];
}

export function youtubeEmbed(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/embed\/)([\w-]{6,})/.exec(url);
  return m ? `https://www.youtube-nocookie.com/embed/${m[1]}?autoplay=1&rel=0` : null;
}
