export function maskName(name?: string | null) {
  if (!name) return "Alguien";
  const [first, last] = name.trim().split(/\s+/);
  return last ? `${first} ${last[0]}.` : first;
}

export function euros(v: number | string | { toString(): string }) {
  return Number(v).toLocaleString("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 2 });
}
