import { CalendarCheck2, Gift, ShieldCheck, Sparkles } from "lucide-react";
import { CareAfricaLogo } from "@/components/brand/CareAfricaLogo";
import { RandIcon } from "@/components/icons/RandIcon";

const HIGHLIGHTS = [
  {
    icon: CalendarCheck2,
    title: "Bookings and a live waiting room",
    body: "See who has arrived, who is waiting and for how long, at a glance.",
  },
  {
    icon: Gift,
    title: "Loyalty that brings patients back",
    body: "Points on every visit and purchase, with rewards members can redeem.",
  },
  {
    icon: RandIcon,
    title: "Sales and stock, in rand",
    body: "Sell products at the front desk and keep stock levels honest.",
  },
  {
    icon: ShieldCheck,
    title: "Your practice, your data",
    body: "Each practice sees only its own records, in its own colours.",
  },
];

/**
 * Split-screen frame for the sign-in, register and verify-email pages.
 * Left: Care Africa's story (hidden on small screens). Right: the form.
 * These pages come before login, so they always use Care Africa's own
 * colours rather than a practice's.
 */
export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="min-h-screen grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] bg-background">
      {/* Story panel */}
      <aside className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-ink p-12 xl:p-16 text-white">
        {/* Soft brand glow and a faint grid, for depth without imagery */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 -left-32 h-[520px] w-[520px] rounded-full opacity-40 blur-3xl"
          style={{ background: "radial-gradient(circle, hsl(var(--brand-primary)) 0%, transparent 65%)" }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
            maskImage: "radial-gradient(ellipse at 30% 20%, black 20%, transparent 70%)",
            WebkitMaskImage: "radial-gradient(ellipse at 30% 20%, black 20%, transparent 70%)",
          }}
        />

        <CareAfricaLogo tone="light" className="relative" />

        <div className="relative max-w-md">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-white/80">
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            Practice management for South Africa
          </p>
          <h2 className="mt-6 text-4xl xl:text-[44px] font-extrabold leading-[1.08] tracking-tight">
            Run a calmer practice.
            <span className="block text-accent">Keep patients coming back.</span>
          </h2>

          <ul className="mt-10 space-y-6">
            {HIGHLIGHTS.map(({ icon: Icon, title, body }) => (
              <li key={title} className="flex gap-4">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.07] ring-1 ring-white/10">
                  <Icon className="h-[18px] w-[18px] text-accent" />
                </span>
                <div>
                  <p className="font-semibold">{title}</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-white/60">{body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-white/40">
          © {new Date().getFullYear()} Care Africa Consultancy · Made in South Africa
        </p>
      </aside>

      {/* Form panel */}
      <main className="flex flex-col px-6 py-10 sm:px-10">
        <CareAfricaLogo className="lg:hidden" />
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-[400px] animate-fade-in">
            <h1 className="text-[28px] font-extrabold tracking-tight text-ink">{title}</h1>
            {subtitle && <p className="mt-2 text-[15px] text-muted-foreground">{subtitle}</p>}
            <div className="mt-8">{children}</div>
            {footer && <div className="mt-8 text-center text-sm text-muted-foreground">{footer}</div>}
          </div>
        </div>
      </main>
    </div>
  );
}
