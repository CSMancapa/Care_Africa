/**
 * Practice branding: turns a practice's brand colours into the CSS variables
 * the app's theme reads (see index.css and tailwind.config.ts).
 *
 * Only the brand colours change per practice. Status colours (errors,
 * warnings, success, clinical alerts) stay fixed, so a red "allergy" badge
 * means the same thing in every practice.
 */

export const POWERED_BY_TEXT = "Powered by Care Africa Consultancy";

/** Care Africa's own colours, used when a practice hasn't set any. */
export const DEFAULT_BRAND = {
  primary: "#EA7C1F",
  accent: "#FFB067",
} as const;

const HEX = /^#[0-9a-f]{6}$/i;

export function isHexColor(value: string | null | undefined): value is string {
  return !!value && HEX.test(value);
}

type RGB = [number, number, number];

function hexToRgb(hex: string): RGB {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex([r, g, b]: RGB): string {
  return "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("").toUpperCase();
}

/** "H S% L%" — the format shadcn/tailwind's hsl(var(--x) / alpha) expects. */
function rgbToHslTriplet([r, g, b]: RGB): string {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn: h = (gn - bn) / d + (gn < bn ? 6 : 0); break;
      case gn: h = (bn - rn) / d + 2; break;
      default: h = (rn - gn) / d + 4;
    }
    h *= 60;
  }
  return `${h.toFixed(1)} ${(s * 100).toFixed(1)}% ${(l * 100).toFixed(1)}%`;
}

function luminance([r, g, b]: RGB): number {
  const lin = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export function contrastRatio(a: string, b: string): number {
  const la = luminance(hexToRgb(a)), lb = luminance(hexToRgb(b));
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

const WHITE = "#FFFFFF";
const INK = "#111827";

/** White or near-black text, whichever reads better on the colour. */
export function readableTextOn(hex: string): string {
  return contrastRatio(hex, WHITE) >= contrastRatio(hex, INK) ? WHITE : INK;
}

/**
 * Very light brand colours (pale yellow, mint…) disappear on the white app
 * background when used for links, icons and the active menu item. Darken
 * them just enough to reach 3:1 against white, the WCAG minimum for UI
 * elements. Colours that already pass are returned unchanged.
 */
export function ensureVisibleOnWhite(hex: string): string {
  let rgb = hexToRgb(hex);
  for (let i = 0; i < 40 && contrastRatio(rgbToHex(rgb), WHITE) < 3; i++) {
    rgb = rgb.map((v) => v * 0.94) as RGB;
  }
  return rgbToHex(rgb);
}

export interface BrandColors {
  primary?: string | null;
  accent?: string | null;
}

/** The colours that will actually be used, after defaults and adjustment. */
export function resolveBrand(colors: BrandColors) {
  const rawPrimary = isHexColor(colors.primary) ? colors.primary.toUpperCase() : null;
  const rawAccent = isHexColor(colors.accent) ? colors.accent.toUpperCase() : null;
  const primary = rawPrimary ? ensureVisibleOnWhite(rawPrimary) : DEFAULT_BRAND.primary;
  const accent = rawAccent ?? DEFAULT_BRAND.accent;
  return {
    primary,
    accent,
    primaryAdjusted: !!rawPrimary && primary !== rawPrimary,
    isDefault: !rawPrimary && !rawAccent,
  };
}

/** Apply a practice's colours to the whole app. */
export function applyBrand(colors: BrandColors, root: HTMLElement = document.documentElement) {
  const { primary, accent, isDefault } = resolveBrand(colors);
  if (isDefault) {
    resetBrand(root);
    return;
  }
  root.style.setProperty("--brand-primary", rgbToHslTriplet(hexToRgb(primary)));
  root.style.setProperty("--brand-primary-foreground", rgbToHslTriplet(hexToRgb(readableTextOn(primary))));
  root.style.setProperty("--brand-accent", rgbToHslTriplet(hexToRgb(accent)));
  root.style.setProperty("--brand-accent-foreground", rgbToHslTriplet(hexToRgb(readableTextOn(accent))));
  root.style.setProperty("--ring", rgbToHslTriplet(hexToRgb(primary)));
}

/** Back to Care Africa's default colours (e.g. after logout). */
export function resetBrand(root: HTMLElement = document.documentElement) {
  ["--brand-primary", "--brand-primary-foreground", "--brand-accent", "--brand-accent-foreground", "--ring"]
    .forEach((v) => root.style.removeProperty(v));
}
