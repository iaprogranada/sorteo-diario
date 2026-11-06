import { prisma } from "./db";

export type RewardReason = "WELCOME" | "PROFILE" | "DAILY_LOGIN" | "STREAK_7" | "REFERRAL" | "AD_VIDEO" | "SHARE";

export interface RewardRule {
  amount: number;
  dailyLimit?: number; // nº de veces al día (si aplica)
  once?: boolean; // solo una vez en la vida
  exemptFromDailyCap?: boolean;
  label: string;
}

export interface AppSettings {
  maxTicketsRegular: number;
  maxTicketsSpecial: number;
  maxTicketsPremium: number; // 0 = ilimitado
  unlockTickets: number;
  extraActionTickets: number;
  maxExtraActions: number;
  dailyWildcardCap: number;
  maxPrizeValue: number; // el premio debe ser INFERIOR a este valor
  regularDurations: number[]; // horas
  specialMaxHours: number;
  claimDays: number;
  publishHour: number;
  rewards: Record<RewardReason, RewardRule>;
}

export const DEFAULT_SETTINGS: AppSettings = {
  maxTicketsRegular: 10,
  maxTicketsSpecial: 30,
  maxTicketsPremium: 0,
  unlockTickets: 3,
  extraActionTickets: 1,
  maxExtraActions: 5,
  dailyWildcardCap: 25,
  maxPrizeValue: 300,
  regularDurations: [24, 48, 72],
  specialMaxHours: 168,
  claimDays: 7,
  publishHour: 8,
  rewards: {
    WELCOME: { amount: 10, once: true, exemptFromDailyCap: true, label: "Bienvenida (verificar teléfono)" },
    PROFILE: { amount: 5, once: true, exemptFromDailyCap: true, label: "Completar el perfil" },
    DAILY_LOGIN: { amount: 2, dailyLimit: 1, label: "Entrar cada día" },
    STREAK_7: { amount: 5, label: "Racha de 7 días seguidos" },
    REFERRAL: { amount: 5, dailyLimit: 5, label: "Invitar a un amigo que se verifica" },
    AD_VIDEO: { amount: 1, dailyLimit: 5, label: "Ver un vídeo de un anunciante" },
    SHARE: { amount: 1, dailyLimit: 3, label: "Compartir un sorteo" },
  },
};

export async function getSettings(): Promise<AppSettings> {
  const row = await prisma.setting.findUnique({ where: { key: "app" } });
  const stored = (row?.value ?? {}) as Partial<AppSettings>;
  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    rewards: { ...DEFAULT_SETTINGS.rewards, ...(stored.rewards ?? {}) },
  };
}

export async function saveSettings(s: AppSettings) {
  await prisma.setting.upsert({
    where: { key: "app" },
    create: { key: "app", value: s as unknown as object },
    update: { value: s as unknown as object },
  });
}

export function maxTicketsFor(type: "REGULAR" | "SPECIAL" | "PREMIUM", s: AppSettings): number {
  if (type === "REGULAR") return s.maxTicketsRegular;
  if (type === "SPECIAL") return s.maxTicketsSpecial;
  return s.maxTicketsPremium;
}
