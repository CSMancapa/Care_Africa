/**
 * Rewards in the new schema, in the shape the screens use (src/types/rewards.ts).
 *
 *   rewards        points_cost (shown as points_required), type free/discount,
 *                  service_id or product_id, soft-deleted with deleted_at
 *   reward_claims  one per claim, with a redemption code
 *   claim_reward() spends the member's points through the ledger
 */
import { supabase } from "@/config/supabase";
import type { RewardItem } from "@/types/rewards";

function check(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

const SELECT = "id, practice_id, name, description, points_cost, type, service_id, product_id, discount_percentage, deleted_at";

export function toUiReward(r: any): RewardItem {
  return {
    id: r.id,
    practice_id: r.practice_id,
    name: r.name,
    description: r.description ?? undefined,
    type: r.type,
    points_required: r.points_cost,
    service_id: r.service_id ?? undefined,
    product_id: r.product_id ?? undefined,
    discount_percentage: r.discount_percentage === null ? undefined : Number(r.discount_percentage),
    deleted_at: r.deleted_at,
  };
}

export async function listRewards(practiceId: string, opts: { archived?: boolean } = {}): Promise<RewardItem[]> {
  let q = supabase.from("rewards").select(SELECT).eq("practice_id", practiceId);
  q = opts.archived ? q.not("deleted_at", "is", null) : q.is("deleted_at", null);
  const { data, error } = await q.order("points_cost");
  check(error);
  return (data ?? []).map(toUiReward);
}

export async function createRewards(practiceId: string, rewards: RewardItem[]) {
  const { error } = await supabase.from("rewards").insert(
    rewards.map((r) => ({
      practice_id: practiceId,
      name: r.name,
      description: r.description ?? null,
      type: r.type === "discount" ? "discount" : "free",
      points_cost: Math.max(1, Math.round(Number(r.points_required) || 0)),
      service_id: r.service_id || null,
      product_id: r.product_id || null,
      discount_percentage: r.type === "discount" ? r.discount_percentage ?? null : null,
    }))
  );
  check(error);
}

export async function archiveReward(rewardId: string) {
  const { error } = await supabase.from("rewards").update({ deleted_at: new Date().toISOString() }).eq("id", rewardId);
  check(error);
}

export async function restoreReward(rewardId: string) {
  const { error } = await supabase.from("rewards").update({ deleted_at: null }).eq("id", rewardId);
  check(error);
}

/** Spend a member's points on a reward. Returns the redemption code. */
export async function claimReward(patientId: string, rewardId: string) {
  const { data, error } = await supabase.rpc("claim_reward", { p_patient_id: patientId, p_reward_id: rewardId });
  check(error);
  const row = (data ?? [])[0];
  return { code: row.redemption_code as string, pointsLeft: row.points_left as number };
}

export interface RecentClaim {
  id: string;
  reward_name: string;
  patient_name: string;
  points_used: number;
  redemption_code: string;
  is_redeemed: boolean;
  created_at: string;
}

export async function listRecentClaims(practiceId: string, limit = 20): Promise<{ items: RecentClaim[]; total: number }> {
  const { data, error, count } = await supabase
    .from("reward_claims")
    .select("id, points_used, redemption_code, is_redeemed, created_at, reward:rewards(name), patient:patients(full_name)", {
      count: "exact",
    })
    .eq("practice_id", practiceId)
    .order("created_at", { ascending: false })
    .limit(limit);
  check(error);
  return {
    total: count ?? 0,
    items: (data ?? []).map((c: any) => {
      const reward = Array.isArray(c.reward) ? c.reward[0] : c.reward;
      const patient = Array.isArray(c.patient) ? c.patient[0] : c.patient;
      return {
        id: c.id,
        reward_name: reward?.name ?? "Reward",
        patient_name: patient?.full_name ?? "Member",
        points_used: c.points_used,
        redemption_code: c.redemption_code,
        is_redeemed: c.is_redeemed,
        created_at: c.created_at,
      };
    }),
  };
}

/** Totals for the Rewards page: all claims, how many were used, points spent on used ones. */
export async function rewardMetrics(practiceId: string) {
  const { data, error } = await supabase
    .from("reward_claims")
    .select("points_used, is_redeemed")
    .eq("practice_id", practiceId);
  check(error);
  const claims = data ?? [];
  const used = claims.filter((c) => c.is_redeemed);
  return {
    totalClaims: claims.length,
    totalRedeemed: used.length,
    pointsRedeemed: used.reduce((sum, c) => sum + (c.points_used || 0), 0),
  };
}
