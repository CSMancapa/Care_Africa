import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowRight, Check, Loader2, MailCheck, TriangleAlert } from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/config/supabase";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePractice } from "@/context/PracticeContext";
import { ROLE_INFO } from "@/lib/roles";
import { acceptInvitation, getInvitation, type InvitationPreview } from "@/lib/db/team";

type Mode = "create" | "signin";

const DEAD_LINK: Record<string, { title: string; body: string }> = {
  invalid: { title: "This link isn't valid", body: "Check that you opened the whole link, or ask your practice admin to send a new one." },
  expired: { title: "This invitation has expired", body: "Invitation links work for 7 days. Ask your practice admin to send a new one." },
  revoked: { title: "This invitation was cancelled", body: "Ask your practice admin if you should have access." },
  accepted: { title: "This invitation has already been used", body: "If it was you, sign in with your email address and password." },
};

/**
 * /invite/:token — someone joins a practice from the link their practice
 * admin sent them. They create a login (or sign in) with the invited email
 * address, then join automatically.
 */
export default function AcceptInvite() {
  const { token = "" } = useParams();
  const navigate = useNavigate();
  const { refresh } = usePractice();

  const [invite, setInvite] = useState<InvitationPreview | null>(null);
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [mode, setMode] = useState<Mode>("create");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const joining = useRef(false);

  useEffect(() => {
    getInvitation(token)
      .then(setInvite)
      .catch(() => setInvite({ status: "invalid" }));
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, [token]);

  const roleLabel = invite?.role ? ROLE_INFO[invite.role].label.toLowerCase() : "";
  const signedInEmail = session?.user.email?.toLowerCase();
  const rightAccount = !!session && !!invite?.email && signedInEmail === invite.email.toLowerCase();

  // Signed in with the invited address: join straight away.
  useEffect(() => {
    if (invite?.status !== "pending" || !rightAccount || joining.current) return;
    joining.current = true;
    acceptInvitation(token)
      .then(async () => {
        await refresh();
        toast.success(`Welcome to ${invite.practice_name}`);
        navigate("/", { replace: true });
      })
      .catch((error) => {
        joining.current = false;
        setJoinError(error instanceof Error ? error.message : "Couldn't join the practice");
      });
  }, [invite?.status, rightAccount, token]);

  const createAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invite?.email) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: invite.email,
        password,
        options: {
          data: { full_name: fullName.trim() },
          emailRedirectTo: `${window.location.origin}/invite/${token}`,
        },
      });
      if (error) {
        if (/already registered|already exists/i.test(error.message)) {
          setMode("signin");
          toast.message("You already have a Care Africa login. Sign in to join.");
          return;
        }
        throw error;
      }
      // With email confirmation on, there's no session until they click the
      // link in their inbox, which brings them back to this page.
      if (!data.session) setCheckEmail(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't create your login");
    } finally {
      setBusy(false);
    }
  };

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invite?.email) return;
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: invite.email, password });
      if (error) throw error;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't sign in");
    } finally {
      setBusy(false);
    }
  };

  // ---------- states ----------

  if (!invite || session === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (invite.status !== "pending") {
    const copy = DEAD_LINK[invite.status] ?? DEAD_LINK.invalid;
    return (
      <AuthLayout
        title={copy.title}
        subtitle={copy.body}
        footer={
          <Link to="/login" className="font-semibold text-primary hover:underline underline-offset-4">
            Go to sign in
          </Link>
        }
      >
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <TriangleAlert className="h-5 w-5 shrink-0" />
          {invite.practice_name ? `Invitation to ${invite.practice_name}` : "Invitation link"}
        </div>
      </AuthLayout>
    );
  }

  const title = `Join ${invite.practice_name}`;
  const subtitle = (
    <>
      You've been invited as <span className="font-semibold text-ink">{roleLabel}</span>.{" "}
      {invite.role && ROLE_INFO[invite.role].description}
    </>
  );

  if (session && !rightAccount) {
    return (
      <AuthLayout title={title} subtitle={subtitle}>
        <div className="space-y-4 rounded-xl border border-border bg-card p-5 text-sm shadow-card">
          <p>
            You're signed in as <strong>{session.user.email}</strong>, but this invitation is for{" "}
            <strong>{invite.email}</strong>.
          </p>
          <Button
            variant="outline"
            className="w-full"
            onClick={async () => {
              await supabase.auth.signOut();
              setMode("signin");
            }}
          >
            Sign out and continue as {invite.email}
          </Button>
        </div>
      </AuthLayout>
    );
  }

  if (session && rightAccount) {
    return (
      <AuthLayout title={title} subtitle={subtitle}>
        {joinError ? (
          <div className="space-y-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <p>{joinError}</p>
            <Button variant="outline" onClick={() => { setJoinError(null); joining.current = false; setSession({ ...session }); }}>
              Try again
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" /> Adding you to {invite.practice_name}…
          </div>
        )}
      </AuthLayout>
    );
  }

  if (checkEmail) {
    return (
      <AuthLayout
        title="Check your email"
        subtitle={
          <>
            We sent a confirmation link to <span className="font-semibold text-ink">{invite.email}</span>. Open it
            on this device and you'll join {invite.practice_name} straight away.
          </>
        }
      >
        <div className="flex items-start gap-4 rounded-xl border border-border bg-card p-5 shadow-card">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <MailCheck className="h-5 w-5 text-primary" />
          </span>
          <p className="text-sm leading-relaxed text-muted-foreground">
            It can take a minute to arrive. Check your spam folder too.
          </p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title={title}
      subtitle={subtitle}
      footer={
        mode === "create" ? (
          <>
            Already have a Care Africa login?{" "}
            <button type="button" onClick={() => setMode("signin")} className="font-semibold text-primary hover:underline underline-offset-4">
              Sign in instead
            </button>
          </>
        ) : (
          <>
            New to Care Africa?{" "}
            <button type="button" onClick={() => setMode("create")} className="font-semibold text-primary hover:underline underline-offset-4">
              Create your login
            </button>
          </>
        )
      }
    >
      <form onSubmit={mode === "create" ? createAccount : signIn} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" value={invite.email} readOnly disabled className="h-11" />
        </div>

        {mode === "create" && (
          <div className="space-y-2">
            <Label htmlFor="name">Your full name</Label>
            <Input
              id="name"
              required
              autoComplete="name"
              placeholder="As your colleagues know you"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="h-11"
            />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="password">{mode === "create" ? "Choose a password" : "Password"}</Label>
          <PasswordInput
            id="password"
            required
            minLength={mode === "create" ? 8 : undefined}
            autoComplete={mode === "create" ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {mode === "create" && (
            <p className={`flex items-center gap-1.5 text-xs ${password.length >= 8 ? "text-emerald-600" : "text-muted-foreground"}`}>
              <Check className={`h-3.5 w-3.5 ${password.length >= 8 ? "opacity-100" : "opacity-40"}`} />
              At least 8 characters
            </p>
          )}
        </div>

        <Button type="submit" className="h-11 w-full text-[15px]" disabled={busy}>
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              {mode === "create" ? "Create login and join" : "Sign in and join"} <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}
