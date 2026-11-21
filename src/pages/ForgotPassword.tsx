import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { ArrowRight, Loader2, MailCheck } from "lucide-react";
import { supabase } from "@/config/supabase";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** /forgot-password — ask for a reset link by email. */
export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      // Too many requests is worth saying; anything else, show the same
      // message either way so nobody can test which emails have accounts.
      if (error && /rate|too many/i.test(error.message)) throw error;
      setSent(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't send the email");
    } finally {
      setBusy(false);
    }
  };

  const footer = (
    <Link to="/login" className="font-semibold text-primary hover:underline underline-offset-4">
      Back to sign in
    </Link>
  );

  if (sent) {
    return (
      <AuthLayout
        title="Check your email"
        subtitle={
          <>
            If <span className="font-semibold text-ink">{email.trim()}</span> has a Care Africa login, we've sent it a
            link to choose a new password. The link works once and expires after an hour.
          </>
        }
        footer={footer}
      >
        <div className="flex items-start gap-4 rounded-xl border border-border bg-card p-5 shadow-card">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <MailCheck className="h-5 w-5 text-primary" />
          </span>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Nothing after a few minutes? Check your spam folder, and that you used your work email address.
            You'll also need your authenticator app or a recovery code to finish.
          </p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Forgot your password?"
      subtitle="Enter your work email and we'll send you a link to choose a new one."
      footer={footer}
    >
      <form onSubmit={submit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email">Work email</Label>
          <Input
            id="email"
            type="email"
            required
            autoFocus
            autoComplete="email"
            placeholder="you@yourpractice.co.za"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11"
          />
        </div>
        <Button type="submit" className="h-11 w-full text-[15px]" disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Send reset link <ArrowRight className="h-4 w-4" /></>}
        </Button>
      </form>
    </AuthLayout>
  );
}
