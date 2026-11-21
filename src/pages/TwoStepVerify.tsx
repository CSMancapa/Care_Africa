import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowRight, Loader2 } from "lucide-react";
import { supabase } from "@/config/supabase";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CodeInput } from "@/components/twostep/CodeInput";
import { usePractice } from "@/context/PracticeContext";
import { verifyAuthenticatorCode, verifyRecoveryCode } from "@/lib/twoStep";
import { logAuthEvent } from "@/lib/audit";

/**
 * The second step of signing in. Also used inside the password reset page
 * (onDone given): an account with 2FA must pass it before changing the
 * password.
 */
export function TwoStepChallenge({ onDone }: { onDone: () => void }) {
  const [useRecovery, setUseRecovery] = useState(false);
  const [code, setCode] = useState("");
  const [recovery, setRecovery] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (useRecovery) {
        await verifyRecoveryCode(recovery);
        logAuthEvent("recovery_code_used");
      } else {
        await verifyAuthenticatorCode(code);
      }
      onDone();
    } catch (error) {
      logAuthEvent("two_step_failed");
      toast.error(error instanceof Error ? error.message : "That code didn't work");
      setCode("");
    } finally {
      setBusy(false);
    }
  };

  // Submit as soon as six digits are in.
  useEffect(() => {
    if (!useRecovery && code.length === 6 && !busy) {
      (document.getElementById("two-step-form") as HTMLFormElement | null)?.requestSubmit();
    }
  }, [code]);

  return (
    <form id="two-step-form" onSubmit={submit} className="space-y-5">
      {useRecovery ? (
        <div className="space-y-2">
          <Label htmlFor="recovery">Recovery code</Label>
          <Input
            id="recovery"
            autoFocus
            autoComplete="off"
            spellCheck={false}
            placeholder="xxxx-xxxx-xxxx-xxxx"
            value={recovery}
            onChange={(e) => setRecovery(e.target.value)}
            className="h-12 font-mono text-base tracking-wide"
          />
          <p className="text-xs text-muted-foreground">Each recovery code works once.</p>
        </div>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="code">Code from your authenticator app</Label>
          <CodeInput value={code} onChange={setCode} />
        </div>
      )}

      <Button
        type="submit"
        className="h-11 w-full text-[15px]"
        disabled={busy || (useRecovery ? recovery.trim().length < 8 : code.length !== 6)}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Continue <ArrowRight className="h-4 w-4" /></>}
      </Button>

      <div className="space-y-2 text-center text-sm">
        <button
          type="button"
          onClick={() => {
            setUseRecovery((v) => !v);
            setCode("");
            setRecovery("");
          }}
          className="font-semibold text-primary hover:underline underline-offset-4"
        >
          {useRecovery ? "Use my authenticator app instead" : "Lost your phone? Use a recovery code"}
        </button>
        {useRecovery && (
          <p className="text-xs leading-relaxed text-muted-foreground">
            No recovery codes either? Ask your practice admin to reset your two-step sign-in in Settings → Team.
          </p>
        )}
      </div>
    </form>
  );
}

/** /two-step/verify — after the password, before the app. */
export default function TwoStepVerify() {
  const navigate = useNavigate();
  const location = useLocation();
  const { refresh } = usePractice();
  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? "/";

  return (
    <AuthLayout
      title="Enter your code"
      subtitle="Open your authenticator app and type the 6-digit code for Care Africa."
      footer={
        <button
          type="button"
          onClick={async () => {
            await supabase.auth.signOut();
            navigate("/login", { replace: true });
          }}
          className="font-medium text-muted-foreground hover:text-ink"
        >
          Sign in as someone else
        </button>
      }
    >
      <TwoStepChallenge
        onDone={async () => {
          await refresh();
          navigate(from, { replace: true });
        }}
      />
    </AuthLayout>
  );
}
