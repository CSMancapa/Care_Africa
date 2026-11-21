import { supabase } from "@/config/supabase";
import type { PracticeRole } from "@/context/PracticeContext";

export interface TeamMember {
  id: string;
  role: PracticeRole;
  isActive: boolean;
  joinedAt: string;
  profileId: string;
  name: string;
  email: string;
}

export interface PendingInvitation {
  id: string;
  email: string;
  role: PracticeRole;
  createdAt: string;
  expiresAt: string;
}

export interface InvitationPreview {
  status: "pending" | "expired" | "accepted" | "revoked" | "invalid";
  practice_name?: string;
  role?: PracticeRole;
  email?: string;
  expires_at?: string;
}

function fail(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

export async function listTeam(practiceId: string): Promise<TeamMember[]> {
  const { data, error } = await supabase
    .from("practice_members")
    .select("id, role, is_active, created_at, profile:profiles(id, full_name, email)")
    .eq("practice_id", practiceId)
    .order("created_at", { ascending: true });
  fail(error);
  type Row = { id: string; role: PracticeRole; is_active: boolean; created_at: string; profile: { id: string; full_name: string | null; email: string | null } | null };
  return ((data ?? []) as unknown as Row[]).map((m) => ({
    id: m.id,
    role: m.role,
    isActive: m.is_active,
    joinedAt: m.created_at,
    profileId: m.profile?.id ?? "",
    name: m.profile?.full_name || "",
    email: m.profile?.email || "",
  }));
}

export async function listPendingInvitations(practiceId: string): Promise<PendingInvitation[]> {
  const { data, error } = await supabase
    .from("practice_invitations")
    .select("id, email, role, created_at, expires_at")
    .eq("practice_id", practiceId)
    .is("accepted_at", null)
    .is("revoked_at", null)
    .order("created_at", { ascending: false });
  fail(error);
  type Row = { id: string; email: string; role: PracticeRole; created_at: string; expires_at: string };
  return ((data ?? []) as Row[]).map((i) => ({
    id: i.id,
    email: i.email,
    role: i.role,
    createdAt: i.created_at,
    expiresAt: i.expires_at,
  }));
}

/** Creates an invitation and returns the link to send. The link is only available now. */
export async function createInvitation(practiceId: string, email: string, role: PracticeRole) {
  const { data, error } = await supabase.rpc("create_invitation", {
    p_practice: practiceId,
    p_email: email,
    p_role: role,
  });
  fail(error);
  const row = Array.isArray(data) ? data[0] : data;
  return {
    link: `${window.location.origin}/invite/${row.token}`,
    expiresAt: row.expires_at as string,
  };
}

export async function revokeInvitation(invitationId: string) {
  const { error } = await supabase.rpc("revoke_invitation", { p_invitation: invitationId });
  fail(error);
}

export async function updateTeamMember(memberId: string, role: PracticeRole, isActive: boolean) {
  const { error } = await supabase.rpc("update_team_member", {
    p_member: memberId,
    p_role: role,
    p_active: isActive,
  });
  fail(error);
}

export async function getInvitation(token: string): Promise<InvitationPreview> {
  const { data, error } = await supabase.rpc("get_invitation", { p_token: token });
  fail(error);
  return (data ?? { status: "invalid" }) as InvitationPreview;
}

export async function acceptInvitation(token: string): Promise<string> {
  const { data, error } = await supabase.rpc("accept_invitation", { p_token: token });
  fail(error);
  return data as string;
}
