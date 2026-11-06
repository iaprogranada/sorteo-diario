import { describe, it, expect } from "vitest";
import { numberForCounter, pickWinners, sha256Hex, generateSeed } from "@/lib/draw";
import { firstRoundAfter, roundTime } from "@/lib/drand";

describe("Sorteo verificable", () => {
  it("es determinista y siempre cae dentro del rango 1..total", () => {
    const { secretSeed } = generateSeed();
    for (const total of [1, 2, 7, 1000, 123457]) {
      for (let c = 0; c < 200; c++) {
        const a = numberForCounter(secretSeed, "abc", c, total);
        expect(a).toBe(numberForCounter(secretSeed, "abc", c, total));
        expect(a).toBeGreaterThanOrEqual(1);
        expect(a).toBeLessThanOrEqual(total);
      }
    }
  });

  it("la huella publicada corresponde a la clave", () => {
    const { secretSeed, seedHash } = generateSeed();
    expect(sha256Hex(secretSeed)).toBe(seedHash);
  });

  it("distribución aproximadamente uniforme", () => {
    const counts = new Array(10).fill(0);
    for (let c = 0; c < 20000; c++) counts[numberForCounter("seed", "rnd", c, 10) - 1]++;
    for (const x of counts) expect(Math.abs(x - 2000)).toBeLessThan(200);
  });

  it("elige ganador + 2 suplentes de personas distintas", () => {
    const owner = (n: number) => `user${n % 4}`; // 4 personas con muchas papeletas
    const picks = pickWinners("seed", "rnd", 100, owner);
    expect(picks).toHaveLength(3);
    expect(new Set(picks.map((p) => p.userId)).size).toBe(3);
    expect(new Set(picks.map((p) => p.number)).size).toBe(3);
    expect(picks[0].counter).toBe(0);
  });

  it("si hay menos personas que puestos, devuelve las que hay", () => {
    const picks = pickWinners("seed", "rnd", 5, () => "solo");
    expect(picks).toHaveLength(1);
    expect(pickWinners("seed", "rnd", 0, () => "x")).toHaveLength(0);
  });

  it("la ronda de drand es la primera posterior al cierre", () => {
    const close = new Date("2026-11-06T23:59:00Z");
    const r = firstRoundAfter(close);
    expect(roundTime(r).getTime()).toBeGreaterThan(close.getTime());
    expect(roundTime(r - 1).getTime()).toBeLessThanOrEqual(close.getTime());
  });
});
