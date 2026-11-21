import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** The 6-digit code from an authenticator app. Phones can autofill it. */
export function CodeInput({
  value,
  onChange,
  autoFocus = true,
  id = "code",
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  autoFocus?: boolean;
  id?: string;
  className?: string;
}) {
  return (
    <Input
      id={id}
      inputMode="numeric"
      autoComplete="one-time-code"
      pattern="[0-9]{6}"
      maxLength={6}
      autoFocus={autoFocus}
      placeholder="000000"
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
      className={cn("tabular h-14 text-center text-2xl font-semibold tracking-[0.5em] placeholder:tracking-[0.5em] placeholder:text-muted-foreground/40", className)}
      aria-label="6-digit code"
    />
  );
}
