import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowRight, Check, KeyRound, Loader2, ShieldCheck, Smartphone } from "lucide-react";
import { supabase } from "@/config/supabase";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CodeInput } from "@/components/twostep/CodeInput";
import { RecoveryCodesPanel } from "@/components/twostep/RecoveryCodesPanel";
import { usePractice } from "@/context/PracticeContext";
import { clearTwoStepCache, makeRecoveryCodes, qrImageSrc, verifyAuthenticatorCode } from "@/lib/twoStep";
import { logAuthEvent } from "@/lib/audit";
import { cn } from "@/lib/utils";

type Step = "intro" | "scan" | "codes";

const STEPS: { id: Step; label: string }[] = [
  { id: "intro", label: "Get the app" },
  { id: "scan", label: "Link it" },
  { id: "codes", label: "Save recovery codes" },
];

/**
 * /two-step/setup — everyone at a practice adds an authenticator app the
 * first time they sign in (or after an admin resets theirs).
 */
export default function TwoStepSetup() {
  const navigate = useNavigate();
  const location = useLocation();
  const { refresh } = usePractice();
  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? "/";

  const [step, setStep] = useState<Step>("intro");
  const [email, setEmail] = useState<string>();
  const [factor, setFactor] = useState<{ id: string; qr: string; secret: string } | null>(null);
  const [showSecret, setShowSecret] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [codes, setCodes] = useState<string[] | null>(null);
  const [codesUnavailable, setCodesUnavailable] = useState(false);
  const [saved, setSaved] = useState(false);
  const enrolling = useRef(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) navigate("/login", { replace: true });
      setEmail(data.user?.email);
    });
  }, [navigate]);

  // Start linking: clear any half-finished attempt, then create a new one.
  const startScan = async () => {
    setStep("scan");
    if (factor || enrolling.current) return;
    enrolling.current = true;
    try {
      const { data: list } = await supabase.auth.mfa.listFactors();
      for (const f of list?.all ?? []) {
        if (f.factor_type === "totp" && f.status !== "verified") {
          await supabase.auth.mfa.unenroll({ factorId: f.id });
        }
      }
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "Authenticator app",
        issuer: "Care Africa",
      });
      if (error) throw error;
      setFactor({ id: data.id, qr: qrImageSrc(data.totp.qr_code), secret: data.totp.secret });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't start two-step sign-in");
      setStep("intro");
    } finally {
      enrolling.current = false;
    }
  };

  const confirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) return;
    setBusy(true);
    try {
      await verifyAuthenticatorCode(code, factor?.id);
      const result = await makeRecoveryCodes().catch(() => ({ unavailable: true as const }));
      if ("codes" in result) setCodes(result.codes);
      else setCodesUnavailable(true);
      setStep("codes");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "That code didn't work");
      setCode("");
    } finally {
      setBusy(false);
    }
  };

  const finish = async () => {
    logAuthEvent("two_step_set_up");
    clearTwoStepCache();
    await refresh();
    toast.success("Two-step sign-in is on");
    navigate(from, { replace: true });
  };

  const stepIndex = STEPS.findIndex((s) => s.id === step);

  return (
    <AuthLayout
      title={step === "codes" ? "Save your recovery codes" : "Protect your login"}
      subtitle={
        step === "codes"
          ? "If you ever lose your phone, one of these codes gets you back in. Each works once."
          : "Care Africa keeps patient information, so every login needs your password and a code from your phone."
      }
      footer={
        <button
          type="button"
          onClick={async () => {
            await supabase.auth.signOut();
            navigate("/login", { replace: true });
          }}
          className="font-medium text-muted-foreground hover:text-ink"
        >
          Sign out and do this later
        </button>
      }
    >
      {/* Progress */}
      <ol className="mb-8 flex items-center gap-2">
        {STEPS.map((s, i) => (
          <li key={s.id} className="flex flex-1 items-center gap-2">
            <span
              className={cn(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                i < stepIndex ? "bg-emerald-500 text-white" : i === stepIndex ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              )}
            >
              {i < stepIndex ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </span>
            <span className={cn("hidden text-xs font-medium sm:block", i === stepIndex ? "text-ink" : "text-muted-foreground")}>{s.label}</span>
            {i < STEPS.length - 1 && <span className="h-px flex-1 bg-border" />}
          </li>
        ))}
      </ol>

      {step === "intro" && (
        <div className="space-y-6">
          <div className="flex gap-4 rounded-xl border border-border bg-card p-5 shadow-card">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <Smartphone className="h-5 w-5 text-primary" />
            </span>
            <div className="text-sm leading-relaxed">
              <p className="font-semibold text-ink">Install an authenticator app on your phone</p>
              <p className="mt-1 text-muted-foreground">
                Google Authenticator or Microsoft Authenticator both work, and are free from the App Store or Google Play.
                If you already have one, use it.
              </p>
            </div>
          </div>
          <Button className="h-11 w-full text-[15px]" onClick={startScan}>
            I have an authenticator app <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {step === "scan" && (
        <form onSubmit={confirm} className="space-y-6">
          <div className="flex items-start gap-5">
            <div className="flex h-40 w-40 shrink-0 items-center justify-center rounded-xl border border-border bg-white p-2">
              {factor ? (
                <img src={factor.qr} alt="QR code to scan with your authenticator app" className="h-full w-full" />
              ) : (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              )}
            </div>
            <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">
              <p>
                In your authenticator app, tap <span className="font-semibold text-ink">+</span> and scan this code.
              </p>
              {factor && (
                <div>
                  <button type="button" onClick={() => setShowSecret((v) => !v)} className="text-xs font-semibold text-primary hover:underline">
                    {showSecret ? "Hide the setup key" : "Can't scan? Type a key instead"}
                  </button>
                  {showSecret && (
                    <p className="mt-1.5 break-all rounded-md bg-muted px-2 py-1.5 font-mono text-xs text-ink">{factor.secret}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="code">Enter the 6-digit code the app shows</Label>
            <CodeInput value={code} onChange={setCode} />
          </div>

          <Button type="submit" className="h-11 w-full text-[15px]" disabled={busy || code.length !== 6 || !factor}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Confirm <ArrowRight className="h-4 w-4" /></>}
          </Button>
        </form>
      )}

      {step === "codes" && (
        <div className="space-y-6">
          {codes ? (
            <>
              <RecoveryCodesPanel codes={codes} email={email} />
              <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
                <KeyRound className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Keep them somewhere safe and private, like a password manager or a printed copy at home. You won't see
                them again, but you can make new ones in Settings → My security.
              </p>
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm">
                <input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} className="h-4 w-4 accent-[hsl(var(--primary))]" />
                I've saved my recovery codes
              </label>
            </>
          ) : (
            codesUnavailable && (
              <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-800">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                  Two-step sign-in is on. Recovery codes aren't available yet, so if you lose your phone, ask your
                  practice admin to reset your two-step sign-in.
                </p>
              </div>
            )
          )}
          <Button className="h-11 w-full text-[15px]" disabled={!!codes && !saved} onClick={finish}>
            Continue to Care Africa <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </AuthLayout>
  );
}
