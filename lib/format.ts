const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const dateFmt = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
const dateLongFmt = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long" });

export function formatBRL(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  return brl.format(Number(value));
}

/** Converte "YYYY-MM-DD" para Date local sem deslocamento de fuso. */
export function parseDateOnly(date: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return "—";
  return dateFmt.format(parseDateOnly(date.slice(0, 10)));
}

export function formatDateLong(date: Date = new Date()): string {
  const s = dateLongFmt.format(date);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Data de hoje em São Paulo no formato YYYY-MM-DD. */
export function todayISO(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

export function initials(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

/** "63992132267" → "(63) 99213-2267" */
export function formatWhatsApp(digits: string): string {
  const d = digits.replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return digits;
}

const kgFmt = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });

/** Ex.: "30 kg · R$ 500,00", "R$ 500,00", "Sem mínimo" */
export function formatMinOrder(kg: number | null | undefined, brl: number | null | undefined): string {
  const parts: string[] = [];
  if (kg) parts.push(`${kgFmt.format(Number(kg))} kg`);
  if (brl) parts.push(brl ? formatBRL(brl) : "");
  return parts.length ? parts.join(" · ") : "Sem mínimo";
}

export function percentDiff(price: number, best: number): number | null {
  if (!best) return null;
  return ((price - best) / best) * 100;
}
