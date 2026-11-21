import { useEffect, useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { KeyRound, Loader2, ShieldCheck, Smartphone } from "lucide-react";
import { supabase } from "@/config/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/auth/PasswordInput";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RecoveryCodesPanel } from "@/components/twostep/RecoveryCodesPanel";
import { getAuthenticator, getRecoveryCodesStatus, makeRecoveryCodes } from "@/lib/twoStep";

/** Settings → My security: the signed-in person's own login. */
export function MySecuritySettings() {
  const [email, setEmail] = useState<string>();
  const [authenticatorSince, setAuthenticatorSince] = useState<string | null | undefined>(undefined);
  const [codesStatus, setCodesStatus] = useState<{ total: number; remaining: number } | null | undefined>(undefined);
  const [newCodes, setNewCodes] = useState<string[] | null>(null);
  const [making, setMaking] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const [{ data }, factor, status] = await Promise.all([
      supabase.auth.getUser(),
      getAuthenticator(),
      getRecoveryCodesStatus(),
    ]);
    setEmail(data.user?.email);
    setAuthenticatorSince(factor ? factor.created_at : null);
    setCodesStatus(status);
  };

  useEffect(() => {
    load();
  }, []);

  const newRecoveryCodes = async () => {
    setMaking(true);
    try {
      const result = await makeRecoveryCodes();
      if ("unavailable" in result) {
        toast.error("Recovery codes aren't switched on for Care Africa yet.");
        return;
      }
      setNewCodes(result.codes);
      load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't make new codes");
    } finally {
      setMaking(false);
    }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return toast.error("Use at least 8 characters");
    if (password !== confirm) return toast.error("The two passwords don't match");
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setPassword("");
      setConfirm("");
      toast.success("Password changed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't change your password");
    } finally {
      setSaving(false);
    }
  };

  const low = codesStatus && codesStatus.remaining <= 2;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Two-step sign-in</CardTitle>
          <CardDescription>Signing in to {email ?? "your account"} needs your password and your phone.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-4 rounded-lg border border-border px-4 py-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Smartphone className="h-[18px] w-[18px] text-primary" />
            </span>
            <div className="min-w-0 flex-1 text-sm">
              <p className="font-semibold text-ink">Authenticator app</p>
              <p className="text-xs text-muted-foreground">
                {authenticatorSince === undefined
                  ? "Checking…"
                  : authenticatorSince
                  ? `On since ${format(new Date(authenticatorSince), "d MMM yyyy")}`
                  : "Not set up. You'll be asked to add one the next time you sign in."}
              </p>
            </div>
            {authenticatorSince && <ShieldCheck className="h-5 w-5 text-emerald-600" />}
          </div>

          <div className="flex flex-wrap items-center gap-4 rounded-lg border border-border px-4 py-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <KeyRound className="h-[18px] w-[18px] text-primary" />
            </span>
            <div className="min-w-0 flex-1 text-sm">
              <p className="font-semibold text-ink">Recovery codes</p>
              <p className={`text-xs ${low ? "font-semibold text-amber-700" : "text-muted-foreground"}`}>
                {codesStatus === undefined
                  ? "Checking…"
                  : codesStatus
                  ? `${codesStatus.remaining} of ${codesStatus.total} left${low ? ". Make new ones soon." : ""}`
                  : "None yet. Make a set in case you lose your phone."}
              </p>
            </div>
            <Button variant="outline" size="sm" disabled={making || !authenticatorSince} onClick={newRecoveryCodes}>
              {making ? <Loader2 className="h-4 w-4 animate-spin" /> : codesStatus ? "Make new codes" : "Make codes"}
            </Button>
          </div>
          {codesStatus && (
            <p className="text-xs text-muted-foreground">Making new codes stops your old ones from working.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Change password</CardTitle>
          <CardDescription>Use at least 8 characters. A short sentence is easy to remember and hard to guess.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={changePassword} className="grid gap-4 sm:max-w-md">
            <div className="space-y-2">
              <Label htmlFor="new-password">New password</Label>
              <PasswordInput id="new-password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Type it again</Label>
              <PasswordInput id="confirm-password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </div>
            <div>
              <Button type="submit" disabled={saving || !password}>
                {saving ? "Saving…" : "Change password"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Dialog open={!!newCodes} onOpenChange={(open) => !open && setNewCodes(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Your new recovery codes</DialogTitle>
            <DialogDescription>Your old codes no longer work. Save these now: you won't see them again.</DialogDescription>
          </DialogHeader>
          {newCodes && <RecoveryCodesPanel codes={newCodes} email={email} />}
          <DialogFooter>
            <Button onClick={() => setNewCodes(null)}>I've saved them</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
