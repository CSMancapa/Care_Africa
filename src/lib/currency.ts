/**
 * Money in Care Africa is always South African rand.
 *
 * Use these helpers for every amount shown on screen, so the format stays the
 * same everywhere (R 1 234,50, the South African standard) and a "$" can't
 * creep back in.
 */

const full = new Intl.NumberFormat("en-ZA", {
  style: "currency",
  currency: "ZAR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const compact = new Intl.NumberFormat("en-ZA", {
  style: "currency",
  currency: "ZAR",
  notation: "compact",
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

function toNumber(value: number | string | null | undefined): number {
  const n = typeof value === "string" ? Number(value) : value ?? 0;
  return Number.isFinite(n) ? (n as number) : 0;
}

/** R 1 234,50 */
export function formatRand(value: number | string | null | undefined): string {
  return full.format(toNumber(value));
}

/** R 12,3K — for headline figures on stat cards. Small amounts stay exact. */
export function formatRandCompact(value: number | string | null | undefined): string {
  const n = toNumber(value);
  return Math.abs(n) < 10_000 ? full.format(n) : compact.format(n);
}

const whole = new Intl.NumberFormat("en-ZA", {
  style: "currency",
  currency: "ZAR",
  maximumFractionDigits: 0,
});

/** R 4 500 — for chart axes, where cents are noise. */
export function formatRandWhole(value: number | string | null | undefined): string {
  const n = toNumber(value);
  return Math.abs(n) < 100_000 ? whole.format(n) : compact.format(n);
}
