/**
 * Reads and writes a practice's settings in the new schema
 * (0001 + 0004_practice_settings.sql), in the shapes the Settings and
 * Onboarding screens already use.
 *
 *   practices          name, contact, address, category, hours, specialties,
 *                      insurers, reward rules, logo_url, setup_completed
 *   services           one row per service (saved via replace_practice_services)
 *   practice_doctors   one row per doctor  (saved via replace_practice_doctors)
 */
import { supabase } from "@/config/supabase";
import type { BusinessHours, DoctorProfile, PracticeData, ServicePrice } from "@/types/practice";

const LOGO_BUCKET = "practice-branding";

export interface PracticeServiceRow extends ServicePrice {
  id: string;
}

export interface PracticeDoctorRow extends DoctorProfile {
  id: string;
}

export interface PointsRules {
  perVisit: number;
  perReferral: number;
  perReview: number;
}

const blankToNull = (v: string | null | undefined) => (v && v.trim() !== "" ? v.trim() : null);

function check(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------

export async function loadServices(practiceId: string): Promise<PracticeServiceRow[]> {
  const { data, error } = await supabase
    .from("services")
    .select("id, name, price, description")
    .eq("practice_id", practiceId)
    .is("deleted_at", null)
    .order("name");
  check(error);
  return (data ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    price: Number(s.price),
    description: s.description ?? undefined,
  }));
}

export async function loadDoctors(practiceId: string): Promise<PracticeDoctorRow[]> {
  const { data, error } = await supabase
    .from("practice_doctors")
    .select("id, name, specialization, availability")
    .eq("practice_id", practiceId)
    .is("deleted_at", null)
    .order("created_at");
  check(error);
  return (data ?? []).map((d) => ({
    id: d.id,
    name: d.name,
    specialization: d.specialization ?? "",
    availability: (d.availability ?? {}) as DoctorProfile["availability"],
  }));
}

export interface PracticeSettings extends PracticeData {
  setup_completed: boolean;
  points_rules: PointsRules;
  reward_campaigns: string[];
}

export async function loadPracticeSettings(practiceId: string): Promise<PracticeSettings> {
  const [{ data: p, error }, services, doctors] = await Promise.all([
    supabase
      .from("practices")
      .select(
        "name, email, phone, address_line1, city, province, postal_code, logo_url, category, " +
          "business_hours, specialties, accepted_insurances, percentage_reward, referral_points, " +
          "points_rules, reward_campaigns, setup_completed"
      )
      .eq("id", practiceId)
      .single(),
    loadServices(practiceId),
    loadDoctors(practiceId),
  ]);
  check(error);
  const row = p as any;

  const hours = row.business_hours && Object.keys(row.business_hours).length > 0
    ? (row.business_hours as BusinessHours)
    : undefined;

  return {
    name: row.name ?? "",
    email: row.email ?? "",
    phone: row.phone ?? "",
    address: row.address_line1 ?? "",
    city: row.city ?? "",
    province: row.province ?? "",
    postal_code: row.postal_code ?? "",
    display_picture: row.logo_url ?? null,
    category: row.category ?? "other",
    business_hours: hours,
    services: services.map(({ id: _id, ...s }) => s),
    doctors: doctors.map(({ id: _id, ...d }) => d),
    specialties: row.specialties ?? [],
    accepted_insurances: row.accepted_insurances ?? [],
    percentage_reward: Number(row.percentage_reward ?? 1),
    referral_points: Number(row.referral_points ?? 100),
    rewards: {
      percentage_reward: Number(row.percentage_reward ?? 1),
      referral_points: Number(row.referral_points ?? 100),
    },
    points_rules: row.points_rules ?? { perVisit: 0, perReferral: 0, perReview: 0 },
    reward_campaigns: row.reward_campaigns ?? [],
    setup_completed: !!row.setup_completed,
  };
}

export async function isSetupCompleted(practiceId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("practices")
    .select("setup_completed")
    .eq("id", practiceId)
    .single();
  check(error);
  return !!data?.setup_completed;
}

// ---------------------------------------------------------------------------
// Writing
// ---------------------------------------------------------------------------

/** Update columns on the practice row. Fails clearly if nothing was updated
 *  (e.g. the user isn't a practice admin, so row-level security blocked it). */
async function updatePractice(practiceId: string, values: Record<string, unknown>) {
  const { data, error } = await supabase
    .from("practices")
    .update(values)
    .eq("id", practiceId)
    .select("id");
  check(error);
  if (!data || data.length === 0) {
    throw new Error("Only a practice admin can change these settings.");
  }
}

export async function saveGeneral(
  practiceId: string,
  v: Pick<PracticeData, "name" | "email" | "phone" | "address" | "city" | "province" | "postal_code" | "display_picture" | "category">
) {
  await updatePractice(practiceId, {
    name: v.name.trim(),
    email: blankToNull(v.email),
    phone: blankToNull(v.phone),
    address_line1: blankToNull(v.address),
    city: blankToNull(v.city),
    province: blankToNull(v.province),
    postal_code: blankToNull(v.postal_code),
    logo_url: v.display_picture ?? null,
    category: v.category || "other",
  });
}

/** Switch modules on or off. The database refuses anything the plan doesn't include. */
export async function saveModules(
  practiceId: string,
  m: { clinicalRecords: "off" | "intake" | "full"; claims: boolean }
) {
  await updatePractice(practiceId, {
    clinical_records: m.clinicalRecords,
    claims_enabled: m.claims,
  });
}

export async function saveBusinessHours(practiceId: string, hours: BusinessHours) {
  await updatePractice(practiceId, { business_hours: hours });
}

export async function saveServiceList(practiceId: string, services: ServicePrice[]) {
  const { error } = await supabase.rpc("replace_practice_services", {
    p_practice_id: practiceId,
    p_items: services.map((s) => ({ name: s.name, price: Number(s.price) || 0, description: s.description ?? "" })),
  });
  check(error);
}

/** The Services tab saves services, specialties and medical aids together. */
export async function saveServicesSection(
  practiceId: string,
  v: { services: ServicePrice[]; specialties: string[]; accepted_insurances: string[] }
) {
  await saveServiceList(practiceId, v.services);
  await updatePractice(practiceId, {
    specialties: v.specialties,
    accepted_insurances: v.accepted_insurances,
  });
}

export async function saveRewardRules(
  practiceId: string,
  v: { percentage_reward: number; referral_points: number; points_rules?: PointsRules; reward_campaigns?: string[] }
) {
  await updatePractice(practiceId, {
    percentage_reward: v.percentage_reward,
    referral_points: v.referral_points,
    ...(v.points_rules ? { points_rules: v.points_rules } : {}),
    ...(v.reward_campaigns ? { reward_campaigns: v.reward_campaigns } : {}),
  });
}

export async function saveDoctors(practiceId: string, doctors: DoctorProfile[]) {
  const { error } = await supabase.rpc("replace_practice_doctors", {
    p_practice_id: practiceId,
    p_items: doctors.map((d) => ({
      name: d.name,
      specialization: d.specialization ?? "",
      availability: d.availability ?? {},
    })),
  });
  check(error);
}

export async function markSetupCompleted(practiceId: string) {
  await updatePractice(practiceId, { setup_completed: true });
}

/** Upload a logo to the practice's own folder; returns its public URL. */
export async function uploadPracticeLogo(practiceId: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  const path = `${practiceId}/logo-${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(LOGO_BUCKET).upload(path, file, {
    cacheControl: "3600",
    contentType: file.type,
  });
  check(error);
  return supabase.storage.from(LOGO_BUCKET).getPublicUrl(path).data.publicUrl;
}
