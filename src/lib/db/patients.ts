/**
 * Members (patients) in the new schema, in the shape the screens use
 * (src/types/patient.ts).
 *
 *   patients        first_name/last_name (full_name is generated), phone,
 *                   address_line1, date_of_birth, points (kept in step with
 *                   points_ledger by a trigger; never written directly)
 *   reward_claims   + rewards(name): the member's reward history
 */
import { supabase } from "@/config/supabase";
import type { Patient } from "@/types/patient";

const SELECT =
  "id, practice_id, first_name, last_name, full_name, email, phone, address_line1, " +
  "date_of_birth, gender, points, is_active, created_at, " +
  "reward_claims(points_used, redemption_code, is_redeemed, created_at, reward:rewards(id, name, service:services(name)))";

function check(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

/** "Thandi Mokoena" -> first "Thandi", last "Mokoena"; one word -> first only. */
export function splitName(name: string): { first_name: string; last_name: string } {
  const parts = name.trim().split(/\s+/);
  return { first_name: parts[0] ?? "", last_name: parts.slice(1).join(" ") };
}

export function toUiPatient(row: any): Patient {
  return {
    id: row.id,
    practice_id: row.practice_id,
    name: row.full_name || `${row.first_name ?? ""} ${row.last_name ?? ""}`.trim(),
    email: row.email ?? "",
    contact_number: row.phone ?? "",
    address: row.address_line1 ?? "",
    dateOfBirth: row.date_of_birth ?? "",
    status: row.is_active === false ? "inactive" : "active",
    points: row.points ?? 0,
    created_at: row.created_at,
    reward_claims: (row.reward_claims ?? []).map((c: any) => {
      const reward = Array.isArray(c.reward) ? c.reward[0] : c.reward;
      const service = reward && (Array.isArray(reward.service) ? reward.service[0] : reward.service);
      return {
        reward_id: reward?.id ?? "",
        reward_name: reward?.name ?? "Reward",
        points_used: c.points_used,
        claimed_at: c.created_at,
        redemption_code: c.redemption_code,
        is_redeemed: c.is_redeemed,
        service_name: service?.name,
      };
    }),
  };
}

export async function listPatients(practiceId: string): Promise<Patient[]> {
  const { data, error } = await supabase
    .from("patients")
    .select(SELECT)
    .eq("practice_id", practiceId)
    .order("first_name");
  check(error);
  return (data ?? []).map(toUiPatient);
}

export async function getPatient(patientId: string): Promise<Patient> {
  const { data, error } = await supabase.from("patients").select(SELECT).eq("id", patientId).single();
  check(error);
  return toUiPatient(data);
}

export interface NewPatient {
  name: string;
  email?: string;
  contact_number?: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
}

const blankToNull = (v?: string | null) => (v && v.trim() !== "" ? v.trim() : null);

export async function createPatient(practiceId: string, p: NewPatient): Promise<Patient> {
  const { first_name, last_name } = splitName(p.name);
  if (!first_name) throw new Error("A name is required");
  const { data, error } = await supabase
    .from("patients")
    .insert({
      practice_id: practiceId,
      first_name,
      last_name,
      email: blankToNull(p.email),
      phone: blankToNull(p.contact_number),
      date_of_birth: blankToNull(p.dateOfBirth),
      gender: blankToNull(p.gender),
      address_line1: blankToNull(p.address),
    })
    .select(SELECT)
    .single();
  check(error);
  return toUiPatient(data);
}

/**
 * Find a member by email or phone, or add them. Used when a visit is booked
 * for someone typed in by name, so that their visit still earns points.
 */
export async function findOrCreatePatient(
  practiceId: string,
  p: { name: string; email?: string; phone?: string }
): Promise<string> {
  const email = blankToNull(p.email);
  const phone = blankToNull(p.phone);
  if (email || phone) {
    let q = supabase.from("patients").select("id").eq("practice_id", practiceId).limit(1);
    q = email ? q.eq("email", email) : q.eq("phone", phone!);
    const { data, error } = await q;
    check(error);
    if (data && data.length > 0) return data[0].id;
  }
  const created = await createPatient(practiceId, { name: p.name, email: email ?? "", contact_number: phone ?? "" });
  return created.id;
}
