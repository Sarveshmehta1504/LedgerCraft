/**
 * One formatter per concern, used everywhere. Per docs/FRONTEND_REQUIREMENTS.md
 * monetary values must never be hand-formatted per screen.
 */

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatMoney(value: number): string {
  return currency.format(Number.isFinite(value) ? value : 0);
}

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "—" : dateFormatter.format(date);
}

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Money comparison tolerant of float drift — two decimals is the ledger's precision. */
export function moneyEquals(a: number, b: number): boolean {
  return Math.round(a * 100) === Math.round(b * 100);
}

export function titleCase(value: string): string {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
