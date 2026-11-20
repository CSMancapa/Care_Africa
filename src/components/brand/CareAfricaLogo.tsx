import { cn } from "@/lib/utils";
import { DEFAULT_BRAND } from "@/lib/branding";

/**
 * Care Africa's own mark: a rounded tile with a soft cross whose arms open
 * like a hand, in Care Africa orange. Uses fixed colours (not the practice's
 * brand), because this is the product's signature, not the practice's.
 */
export function CareAfricaMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={cn("h-9 w-9 shrink-0", className)} aria-hidden="true">
      <defs>
        <linearGradient id="ca-mark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={DEFAULT_BRAND.accent} />
          <stop offset="1" stopColor={DEFAULT_BRAND.primary} />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="11" fill="url(#ca-mark)" />
      <path
        d="M16.5 10.5h7v6h6v7h-6v6h-7v-6h-6v-7h6z"
        fill="#fff"
        stroke="#fff"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="20" cy="20" r="2.4" fill={DEFAULT_BRAND.primary} />
    </svg>
  );
}

export function CareAfricaLogo({
  className,
  tone = "dark",
}: {
  className?: string;
  /** "dark" text for light backgrounds, "light" text for dark ones. */
  tone?: "dark" | "light";
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <CareAfricaMark />
      <span
        className={cn(
          "text-[17px] font-extrabold tracking-tight",
          tone === "light" ? "text-white" : "text-ink"
        )}
      >
        Care Africa
      </span>
    </div>
  );
}
