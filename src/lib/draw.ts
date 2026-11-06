import { createHash, createHmac, randomBytes } from "node:crypto";

/**
 * Sorteo verificable de Sorteo Diario
 * -----------------------------------
 * 1. Al crear el sorteo se genera `secretSeed` y se publica sha256(secretSeed).
 * 2. Al cerrar se toma la aleatoriedad pública de drand (primera ronda tras el cierre).
 * 3. número = HMAC-SHA256(clave=secretSeed, mensaje=`${randomness}:${contador}`) mod total + 1
 * 4. Contador 0 => ganador. Se sigue con 1, 2, ... para los suplentes, saltando
 *    números repetidos o de personas ya elegidas.
 */

export function generateSeed(): { secretSeed: string; seedHash: string } {
  const secretSeed = randomBytes(32).toString("hex");
  return { secretSeed, seedHash: sha256Hex(secretSeed) };
}

export function sha256Hex(s: string): string {
  return createHash("sha256").update(s, "utf8").digest("hex");
}

export function numberForCounter(secretSeed: string, randomness: string, counter: number, total: number): number {
  if (total <= 0) throw new Error("No hay papeletas");
  const digest = createHmac("sha256", secretSeed).update(`${randomness}:${counter}`, "utf8").digest("hex");
  return Number(BigInt("0x" + digest) % BigInt(total)) + 1;
}

export interface Pick {
  counter: number;
  number: number;
  userId: string;
}

/**
 * Elige ganador + suplentes (personas distintas).
 * `ownerOf(n)` devuelve el userId dueño de la papeleta n.
 */
export function pickWinners(
  secretSeed: string,
  randomness: string,
  total: number,
  ownerOf: (n: number) => string,
  howMany = 3,
  maxCounter = 20000,
): Pick[] {
  const picks: Pick[] = [];
  if (total <= 0) return picks;
  const usedUsers = new Set<string>();
  const usedNumbers = new Set<number>();
  for (let c = 0; c < maxCounter && picks.length < howMany; c++) {
    const n = numberForCounter(secretSeed, randomness, c, total);
    if (usedNumbers.has(n)) continue;
    usedNumbers.add(n);
    const u = ownerOf(n);
    if (usedUsers.has(u)) continue;
    usedUsers.add(u);
    picks.push({ counter: c, number: n, userId: u });
  }
  return picks;
}
