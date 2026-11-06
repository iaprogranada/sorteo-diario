// Utilidades de fecha en zona horaria Europe/Madrid
export const TZ = "Europe/Madrid";

function parts(date: Date) {
  const f = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const o: Record<string, number> = {};
  for (const p of f.formatToParts(date)) if (p.type !== "literal") o[p.type] = Number(p.value);
  return o as { year: number; month: number; day: number; hour: number; minute: number; second: number };
}

/** Clave de día YYYY-MM-DD en hora de Madrid */
export function dayKey(date: Date): string {
  const p = parts(date);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

/** Desfase (ms) de Madrid respecto a UTC en un instante dado */
function tzOffsetMs(date: Date): number {
  const p = parts(date);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/** Construye un Date a partir de una hora "de pared" en Madrid */
export function madridDate(year: number, month: number, day: number, hour = 0, minute = 0): Date {
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  const off1 = tzOffsetMs(new Date(guess));
  const res = guess - off1;
  const off2 = tzOffsetMs(new Date(res));
  return new Date(guess - off2);
}

/** Día anterior a una clave YYYY-MM-DD */
export function previousDayKey(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d - 1));
  return dt.toISOString().slice(0, 10);
}

/** Próxima publicación a la hora indicada (por defecto 8:00) desde `from` */
export function nextPublishTime(from: Date, hour = 8): Date {
  const p = parts(from);
  let candidate = madridDate(p.year, p.month, p.day, hour);
  if (candidate.getTime() <= from.getTime()) candidate = madridDate(p.year, p.month, p.day + 1, hour);
  return candidate;
}

/** Inicio del día (00:00) en Madrid para un instante */
export function startOfMadridDay(date: Date): Date {
  const p = parts(date);
  return madridDate(p.year, p.month, p.day, 0);
}

export function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("es-ES", {
    timeZone: TZ,
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("es-ES", { timeZone: TZ, day: "numeric", month: "long", year: "numeric" }).format(date);
}

/** Valor para <input type="datetime-local"> en hora de Madrid */
export function toLocalInput(date: Date): string {
  const p = parts(date);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
}

/** Lee un <input type="datetime-local"> interpretado como hora de Madrid */
export function fromLocalInput(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
  if (!m) return null;
  return madridDate(+m[1], +m[2], +m[3], +m[4], +m[5]);
}

export function timeLeft(from: Date, to: Date): string {
  const ms = to.getTime() - from.getTime();
  if (ms <= 0) return "Cerrado";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (h >= 48) return `${Math.floor(h / 24)} días`;
  if (h >= 1) return `${h} h ${m} min`;
  return `${m} min`;
}
