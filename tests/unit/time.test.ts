import { describe, it, expect } from "vitest";
import { dayKey, madridDate, nextPublishTime, previousDayKey } from "@/lib/time";

describe("Fechas en Madrid", () => {
  it("dayKey usa la hora de Madrid", () => {
    expect(dayKey(new Date("2026-11-06T23:30:00Z"))).toBe("2026-11-07"); // 00:30 en Madrid (CET)
    expect(dayKey(new Date("2026-07-06T21:30:00Z"))).toBe("2026-07-06"); // 23:30 en Madrid (CEST)
  });
  it("madridDate respeta horario de invierno y verano", () => {
    expect(madridDate(2026, 11, 6, 8).toISOString()).toBe("2026-11-06T07:00:00.000Z");
    expect(madridDate(2026, 7, 6, 8).toISOString()).toBe("2026-07-06T06:00:00.000Z");
  });
  it("próxima publicación a las 8:00", () => {
    expect(nextPublishTime(new Date("2026-11-06T06:00:00Z")).toISOString()).toBe("2026-11-06T07:00:00.000Z");
    expect(nextPublishTime(new Date("2026-11-06T09:00:00Z")).toISOString()).toBe("2026-11-07T07:00:00.000Z");
  });
  it("día anterior", () => {
    expect(previousDayKey("2026-03-01")).toBe("2026-02-28");
  });
});
