import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import {
  Check,
  Copy,
  Link2,
  Mail,
  MessageCircle,
  MoreHorizontal,
  RefreshCw,
  ShieldCheck,
  UserPlus,
  X,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePractice, type PracticeRole } from "@/context/PracticeContext";
import { ROLE_INFO, ROLE_ORDER } from "@/lib/roles";
import {
  createInvitation,
  listPendingInvitations,
  listTeam,
  revokeInvitation,
  updateTeamMember,
  type PendingInvitation,
  type TeamMember,
} from "@/lib/db/team";
import { cn } from "@/lib/utils";

function initials(name: string, email: string) {
  const source = name.trim() || email;
  return source
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

const ROLE_PILL: Record<PracticeRole, string> = {
  practice_admin: "bg-primary/10 text-primary",
  doctor: "bg-teal-50 text-teal-700",
  staff: "bg-slate-100 text-slate-700",
};

function RolePicker({ value, onChange }: { value: PracticeRole; onChange: (r: PracticeRole) => void }) {
  return (
    <div role="radiogroup" aria-label="Role" className="grid gap-2">
      {ROLE_ORDER.map((role) => {
        const selected = value === role;
        return (
          <button
            key={role}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(role)}
            className={cn(
              "flex items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition-all",
              selected ? "border-primary bg-primary/5 ring-4 ring-primary/10" : "border-border hover:bg-muted/40"
            )}
          >
            <span
              className={cn(
                "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2",
                selected ? "border-primary" : "border-input"
              )}
            >
              {selected && <span className="h-2 w-2 rounded-full bg-primary" />}
            </span>
            <span>
              <span className="block text-sm font-semibold text-ink">{ROLE_INFO[role].label}</span>
              <span className="block text-xs text-muted-foreground">{ROLE_INFO[role].description}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** The link to send, with one-tap sharing. Shown once, right after inviting. */
function InviteLinkDialog({
  invite,
  practiceName,
  onClose,
}: {
  invite: { email: string; role: PracticeRole; link: string; expiresAt: string } | null;
  practiceName: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  if (!invite) return null;

  const message =
    `Hi! You've been invited to join ${practiceName} on Care Africa as ${ROLE_INFO[invite.role].label.toLowerCase()}. ` +
    `Set up your login here (the link works until ${format(new Date(invite.expiresAt), "d MMMM")}): ${invite.link}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(invite.link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy. Select the link and copy it yourself.");
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Send this link to {invite.email}</DialogTitle>
          <DialogDescription>
            They'll create their own login with this email address. The link works
            once, until {format(new Date(invite.expiresAt), "d MMMM yyyy")}.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 p-2">
          <Link2 className="ml-1 h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            readOnly
            value={invite.link}
            onFocus={(e) => e.currentTarget.select()}
            className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none"
            aria-label="Invitation link"
          />
          <Button size="sm" variant="outline" onClick={copy} className="shrink-0 gap-1.5">
            {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button asChild variant="outline" className="gap-2">
            <a href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer">
              <MessageCircle className="h-4 w-4" /> WhatsApp
            </a>
          </Button>
          <Button asChild variant="outline" className="gap-2">
            <a
              href={`mailto:${invite.email}?subject=${encodeURIComponent(`Join ${practiceName} on Care Africa`)}&body=${encodeURIComponent(message)}`}
            >
              <Mail className="h-4 w-4" /> Email
            </a>
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          For safety, Care Africa keeps only a scrambled copy of this link. If it gets lost, send a new one from
          the team list.
        </p>

        <DialogFooter>
          <Button onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Settings → Team. Everyone at the practice gets their own login. Admins
 * invite people, set their role and remove access when they leave.
 */
export function TeamSettings() {
  const { practice } = usePractice();
  const isAdmin = practice?.role === "practice_admin";
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invites, setInvites] = useState<PendingInvitation[]>([]);
  const [myId, setMyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<PracticeRole>("staff");
  const [sending, setSending] = useState(false);
  const [newInvite, setNewInvite] = useState<{ email: string; role: PracticeRole; link: string; expiresAt: string } | null>(null);

  const load = useCallback(async () => {
    if (!practice) return;
    setLoading(true);
    try {
      const [team, pending] = await Promise.all([
        listTeam(practice.id),
        isAdmin ? listPendingInvitations(practice.id) : Promise.resolve([]),
      ]);
      setMembers(team);
      setInvites(pending);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't load your team");
    } finally {
      setLoading(false);
    }
  }, [practice?.id, isAdmin]);

  useEffect(() => {
    load();
    import("@/config/supabase").then(({ supabase }) =>
      supabase.auth.getUser().then(({ data }) => setMyId(data.user?.id ?? null))
    );
  }, [load]);

  if (!practice) return null;

  const invite = async (inviteEmail: string, inviteRole: PracticeRole) => {
    setSending(true);
    try {
      const { link, expiresAt } = await createInvitation(practice.id, inviteEmail, inviteRole);
      setNewInvite({ email: inviteEmail.trim().toLowerCase(), role: inviteRole, link, expiresAt });
      setInviteOpen(false);
      setEmail("");
      setRole("staff");
      load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't create the invitation");
    } finally {
      setSending(false);
    }
  };

  const change = async (m: TeamMember, nextRole: PracticeRole, active: boolean, success: string) => {
    try {
      await updateTeamMember(m.id, nextRole, active);
      toast.success(success);
      load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't update the team");
    }
  };

  const active = members.filter((m) => m.isActive);
  const removed = members.filter((m) => !m.isActive);
  const adminCount = active.filter((m) => m.role === "practice_admin").length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4 space-y-0">
          <div>
            <CardTitle className="text-lg">Your team</CardTitle>
            <CardDescription className="mt-1">
              Everyone gets their own login, so you always know who did what. Never share a password.
            </CardDescription>
          </div>
          {isAdmin && (
            <Button className="gap-2" onClick={() => setInviteOpen(true)}>
              <UserPlus className="h-4 w-4" /> Invite someone
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {isAdmin && adminCount < 2 && !loading && (
            <div className="mx-6 mb-4 flex items-start gap-2.5 rounded-lg bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-800">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                <strong>Add a second admin.</strong> If the only admin is ever locked out, another admin can let them
                back in, without waiting for Care Africa support.
              </span>
            </div>
          )}

          {loading ? (
            <div className="space-y-2 px-6 pb-6">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          ) : (
            <ul className="divide-y divide-border border-t border-border">
              {active.map((m) => {
                const isMe = m.profileId === myId;
                return (
                  <li key={m.id} className="flex items-center gap-4 px-6 py-3.5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-ink">
                      {initials(m.name, m.email)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink">
                        {m.name || m.email}
                        {isMe && <span className="ml-2 text-xs font-medium text-muted-foreground">(you)</span>}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {m.name ? `${m.email} · ` : ""}joined {format(new Date(m.joinedAt), "d MMM yyyy")}
                      </p>
                    </div>
                    <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold", ROLE_PILL[m.role])}>
                      {ROLE_INFO[m.role].label}
                    </span>
                    {isAdmin ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Change ${m.name || m.email}`}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                          <DropdownMenuLabel>Change role</DropdownMenuLabel>
                          {ROLE_ORDER.map((r) => (
                            <DropdownMenuItem
                              key={r}
                              disabled={r === m.role}
                              onClick={() => change(m, r, true, `${m.name || m.email} is now ${ROLE_INFO[r].label.toLowerCase()}`)}
                            >
                              {r === m.role ? <Check className="mr-2 h-4 w-4" /> : <span className="mr-2 w-4" />}
                              {ROLE_INFO[r].label}
                            </DropdownMenuItem>
                          ))}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600 focus:text-red-600"
                            onClick={() => {
                              if (window.confirm(`Remove ${m.name || m.email}'s access to ${practice.name}? Their past work stays on record.`)) {
                                change(m, m.role, false, `${m.name || m.email} no longer has access`);
                              }
                            }}
                          >
                            <X className="mr-2 h-4 w-4" /> Remove access
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : (
                      <span className="w-8" />
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {isAdmin && invites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Waiting to join</CardTitle>
            <CardDescription>Invitations that haven't been used yet.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-border border-t border-border">
              {invites.map((i) => {
                const expired = new Date(i.expiresAt) < new Date();
                return (
                  <li key={i.id} className="flex flex-wrap items-center gap-4 px-6 py-3.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink">{i.email}</p>
                      <p className={cn("text-xs", expired ? "text-red-600" : "text-muted-foreground")}>
                        {ROLE_INFO[i.role].label} ·{" "}
                        {expired
                          ? "link expired"
                          : `link expires ${formatDistanceToNow(new Date(i.expiresAt), { addSuffix: true })}`}
                      </p>
                    </div>
                    <Button size="sm" variant="outline" className="gap-1.5" disabled={sending} onClick={() => invite(i.email, i.role)}>
                      <RefreshCw className="h-3.5 w-3.5" /> New link
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-600 hover:text-red-700"
                      onClick={async () => {
                        try {
                          await revokeInvitation(i.id);
                          toast.success("Invitation cancelled");
                          load();
                        } catch (error) {
                          toast.error(error instanceof Error ? error.message : "Couldn't cancel");
                        }
                      }}
                    >
                      Cancel
                    </Button>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      {isAdmin && removed.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Former team members</CardTitle>
            <CardDescription>They can't sign in to this practice. Their past work stays on record.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-border border-t border-border">
              {removed.map((m) => (
                <li key={m.id} className="flex items-center gap-4 px-6 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-muted-foreground">{m.name || m.email}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => change(m, m.role, true, `${m.name || m.email} has access again`)}
                  >
                    Restore access
                  </Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {!isAdmin && <p className="text-right text-sm text-muted-foreground">Only a practice admin can change the team.</p>}

      {/* Invite form */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invite someone to {practice.name}</DialogTitle>
            <DialogDescription>You'll get a link to send them by WhatsApp or email.</DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              invite(email, role);
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="invite-email">Their email address</Label>
              <Input
                id="invite-email"
                type="email"
                required
                autoComplete="off"
                placeholder="name@yourpractice.co.za"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">They must sign in with this address.</p>
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <RolePicker value={role} onChange={setRole} />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setInviteOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={sending}>
                {sending ? "Creating link…" : "Create invitation link"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <InviteLinkDialog invite={newInvite} practiceName={practice.name} onClose={() => setNewInvite(null)} />
    </div>
  );
}
