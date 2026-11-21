import { supabase } from "@/config/supabase";

export type ActivityCategory = "security" | "team" | "clinical" | "members" | "settings" | "sales" | "appointments";

export interface ActivityEntry {
  id: number;
  occurred_at: string;
  category: ActivityCategory;
  action: string;
  description: string;
  actor_id: string | null;
  actor_name: string;
  actor_email: string | null;
  actor_role: "practice_admin" | "doctor" | "staff" | null;
  patient_id: string | null;
  patient_name: string | null;
  target_name: string | null;
  details: { changed?: string[]; values?: Record<string, unknown>; rows?: number; email?: string; role?: string };
  ip: string | null;
  user_agent: string | null;
  source: "database" | "app";
}

export interface ActivityFilters {
  category?: ActivityCategory | null;
  actorId?: string | null;
  search?: string | null;
}

/** One page of the practice's activity, newest first. Pass the last id to get older entries. */
export async function getActivity(practiceId: string, filters: ActivityFilters, before?: number, limit = 50) {
  const { data, error } = await supabase.rpc("get_activity", {
    p_practice: practiceId,
    p_category: filters.category ?? null,
    p_actor: filters.actorId ?? null,
    p_search: filters.search?.trim() || null,
    p_before: before ?? null,
    p_limit: limit,
  });
  if (error) throw new Error(error.message);
  return (data ?? []) as ActivityEntry[];
}
