import { sha256Hex } from "./draw";

// Cadena por defecto de drand (League of Entropy): una ronda cada 30 s
export const DRAND_GENESIS = 1595431050; // segundos
export const DRAND_PERIOD = 30;
export const DRAND_URL = "https://api.drand.sh/public";

/** Primera ronda emitida estrictamente después del instante dado */
export function firstRoundAfter(date: Date): number {
  const t = Math.floor(date.getTime() / 1000);
  return Math.floor((t - DRAND_GENESIS) / DRAND_PERIOD) + 2;
}

export function roundTime(round: number): Date {
  return new Date((DRAND_GENESIS + (round - 1) * DRAND_PERIOD) * 1000);
}

export interface Randomness {
  round: number;
  randomness: string;
  source: "drand" | "mock";
}

/**
 * Obtiene la aleatoriedad pública para el cierre.
 * - DRAND_MODE=live: consulta drand. Devuelve null si la ronda aún no existe.
 * - DRAND_MODE=mock (pruebas): valor determinista simulado.
 */
export async function getRandomness(closedAt: Date, raffleId: string): Promise<Randomness | null> {
  const round = firstRoundAfter(closedAt);
  if (process.env.DRAND_MODE === "live") {
    if (roundTime(round).getTime() > Date.now()) return null;
    try {
      const res = await fetch(`${DRAND_URL}/${round}`, { cache: "no-store" });
      if (!res.ok) return null;
      const json = (await res.json()) as { round: number; randomness: string };
      return { round: json.round, randomness: json.randomness, source: "drand" };
    } catch {
      return null;
    }
  }
  return { round, randomness: sha256Hex(`mock-drand:${raffleId}:${round}`), source: "mock" };
}
