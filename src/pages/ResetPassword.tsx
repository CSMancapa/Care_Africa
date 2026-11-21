import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowRight, Check, Loader2, TriangleAlert } from "lucide-react";
import { supabase } from "@/config/supabase";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { TwoStepChallenge } from "@/pages/TwoStepVerify";
import { clearTwoStepCache } from "@/lib/twoStep";
import { usePractice } from "@/context/PracticeContext";

type Stage = "checking" | "invalid" | "challenge" | "password";

/**
 * /reset-password — opened from the emailed link. If the account has
 * two-step sign-in, the person must enter an authenticator or recovery code
 * before choosing a new password, so a stolen inbox isn't enough.
 */
export default function ResetPassword() {
  const navigate = useNavigate();
  const { refresh } = usePractice();
  const [stage, setStage] = useState<Stage>("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // A failed or expired link comes back with an error in the address.
    if (/error_code=|error=access_denied/.test(window.location.hash + window.location.search)) {
      setStage("invalid");
      return;
    }

    const decide = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return false;
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      setStage(aal?.currentLevel !== "aal2" && aal?.nextLevel === "aal2" ? "challenge" : "password");
      return true;
    };

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") decide();
    });
    // Give the library a moment to read the link, then decide.
    const timer = setTimeout(async () => {
      if (!(await decide())) setStage((s) => (s === "checking" ? "invalid" : s));
    }, 1200);
    return () => {
      sub.subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return toast.error("Use at least 8 characters");
    if (password !== confirm) return toast.error("The two passwords don't match");
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      clearTwoStepCache();
      await refresh();
      toast.success("Password changed");
      navigate("/", { replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't change your password");
    } finally {
      setBusy(false);
    }
  };

  if (stage === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (stage === "invalid") {
    return (
      <AuthLayout
        title="This link has expired"
        subtitle="Reset links work once, for about an hour. Ask for a new one."
        footer={
          <Link to="/login" className="font-semibold text-primary hover:underline underline-offset-4">
            Back to sign in
          </Link>
        }
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <TriangleAlert className="h-5 w-5 shrink-0" /> Open the newest email if you asked more than once.
          </div>
          <Button asChild className="h-11 w-full text-[15px]">
            <Link to="/forgot-password">Send a new link</Link>
          </Button>
        </div>
      </AuthLayout>
    );
  }

  if (stage === "challenge") {
    return (
      <AuthLayout
        title="First, confirm it's you"
        subtitle="Enter the code from your authenticator app, or one of your recovery codes."
      >
        <TwoStepChallenge onDone={() => setStage("password")} />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Choose a new password" subtitle="Use at least 8 characters. A short sentence is easy to remember and hard to guess.">
      <form onSubmit={save} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="password">New password</Label>
          <PasswordInput id="password" required minLength={8} autoComplete="new-password" autoFocus value={password} onChange={(e) => setPassword(e.target.value)} />
          <p className={`flex items-center gap-1.5 text-xs ${password.length >= 8 ? "text-emerald-600" : "text-muted-foreground"}`}>
            <Check className={`h-3.5 w-3.5 ${password.length >= 8 ? "opacity-100" : "opacity-40"}`} /> At least 8 characters
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">Type it again</Label>
          <PasswordInput id="confirm" required autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </div>
        <Button type="submit" className="h-11 w-full text-[15px]" disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Save new password <ArrowRight className="h-4 w-4" /></>}
        </Button>
      </form>
    </AuthLayout>
  );
}
