/**
 * Appointments in the new schema, in the shape the screens use
 * (src/types/appointment.ts).
 *
 *   appointments          scheduled_for, patient_id or walk_in_name/phone,
 *                         doctor_id (practice_doctors), status enum with
 *                         in_room, timestamps for each step of the visit
 *   appointment_services  the services on the visit and the price charged
 *   complete_appointment  marks the visit done and awards points once
 */
import { supabase } from "@/config/supabase";
import type { Appointment } from "@/types/appointment";
import { findOrCreatePatient } from "@/lib/db/patients";

type UiStatus = Appointment["status"];
type DbStatus = "requested" | "scheduled" | "arrived" | "waiting" | "in_room" | "completed" | "cancelled" | "no_show";

const toDbStatus = (s: UiStatus): DbStatus => (s === "in-room" ? "in_room" : (s as DbStatus));
const toUiStatus = (s: DbStatus): UiStatus =>
  s === "in_room" ? "in-room" : s === "no_show" ? "cancelled" : (s as UiStatus);

const SELECT =
  "id, practice_id, patient_id, walk_in_name, walk_in_phone, doctor_id, scheduled_for, status, notes, " +
  "arrived_at, wait_started_at, seen_at, completed_at, created_at, updated_at, " +
  "patient:patients(id, full_name, email, phone), " +
  "doctor:practice_doctors(id, name), " +
  "appointment_services(service_id, name, price)";

function check(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

/** "MM:SS" between two times (the old wait_duration format). */
function mmss(from: string, to: string): string {
  const secs = Math.max(0, Math.round((new Date(to).getTime() - new Date(from).getTime()) / 1000));
  const m = Math.floor(secs / 60);
  return `${String(m).padStart(2, "0")}:${String(secs % 60).padStart(2, "0")}`;
}

export type UiAppointment = Appointment & {
  patient_id: string | null;
  doctor_id: string | null;
  doctor_name?: string;
  notes?: string | null;
};

export function toUiAppointment(row: any): UiAppointment {
  const patient = Array.isArray(row.patient) ? row.patient[0] : row.patient;
  const doctor = Array.isArray(row.doctor) ? row.doctor[0] : row.doctor;
  return {
    id: row.id,
    practice_id: row.practice_id,
    patient_id: row.patient_id,
    patient: patient?.full_name ?? row.walk_in_name ?? "Walk-in",
    patient_email: patient?.email ?? "",
    patient_phone: patient?.phone ?? row.walk_in_phone ?? "",
    doctor_id: row.doctor_id,
    doctor_name: doctor?.name,
    time: row.scheduled_for,
    status: toUiStatus(row.status),
    wait_start_time: row.status === "waiting" ? row.wait_started_at : null,
    wait_duration: row.wait_started_at && row.seen_at ? mmss(row.wait_started_at, row.seen_at) : undefined,
    notes: row.notes,
    created_at: row.created_at,
    updated_at: row.updated_at,
    services: (row.appointment_services ?? []).map((s: any) => ({
      id: s.service_id,
      name: s.name,
      price: Number(s.price),
      description: "",
    })),
  };
}

export async function listAppointments(
  practiceId: string,
  opts: { statuses?: UiStatus[]; from?: Date; to?: Date; patientId?: string } = {}
): Promise<UiAppointment[]> {
  let q = supabase.from("appointments").select(SELECT).eq("practice_id", practiceId);
  if (opts.statuses) q = q.in("status", opts.statuses.map(toDbStatus));
  if (opts.from) q = q.gte("scheduled_for", opts.from.toISOString());
  if (opts.to) q = q.lte("scheduled_for", opts.to.toISOString());
  if (opts.patientId) q = q.eq("patient_id", opts.patientId);
  const { data, error } = await q.order("scheduled_for", { ascending: true });
  check(error);
  return (data ?? []).map(toUiAppointment);
}

async function getAppointment(id: string): Promise<UiAppointment> {
  const { data, error } = await supabase.from("appointments").select(SELECT).eq("id", id).single();
  check(error);
  return toUiAppointment(data);
}

/** Times ("HH:mm", local) already booked for a doctor on a day. */
export async function bookedTimes(doctorId: string, day: Date): Promise<string[]> {
  const start = new Date(day); start.setHours(0, 0, 0, 0);
  const end = new Date(day); end.setHours(23, 59, 59, 999);
  const { data, error } = await supabase
    .from("appointments")
    .select("scheduled_for")
    .eq("doctor_id", doctorId)
    .not("status", "in", "(cancelled,no_show)")
    .gte("scheduled_for", start.toISOString())
    .lte("scheduled_for", end.toISOString());
  check(error);
  return (data ?? []).map((a) => {
    const d = new Date(a.scheduled_for);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  });
}

export interface NewAppointment {
  /** Local date and time, "yyyy-MM-ddTHH:mm:ss". */
  time: string;
  patient: string;
  patient_email?: string;
  patient_phone?: string;
  patient_id?: string;
  doctor_id?: string;
  /** Services with the price actually charged (after any reward). */
  services: { id: string; name: string; price: number }[];
  notes?: string;
}

export async function createAppointment(practiceId: string, a: NewAppointment): Promise<UiAppointment> {
  // Every booked visit is linked to a member record so it can earn points.
  const patientId =
    a.patient_id ||
    (await findOrCreatePatient(practiceId, { name: a.patient, email: a.patient_email, phone: a.patient_phone }));

  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("appointments")
    .insert({
      practice_id: practiceId,
      patient_id: patientId,
      doctor_id: a.doctor_id || null,
      service_id: a.services[0]?.id ?? null,
      scheduled_for: new Date(a.time).toISOString(),
      status: "scheduled",
      notes: a.notes ?? null,
      created_by: user?.id ?? null,
    })
    .select("id")
    .single();
  check(error);

  if (a.services.length > 0) {
    const { error: svcError } = await supabase.from("appointment_services").insert(
      a.services.map((s) => ({
        appointment_id: data.id,
        service_id: s.id,
        name: s.name,
        price: Math.max(0, Number(s.price) || 0),
      }))
    );
    if (svcError) {
      // Don't leave a visit without its services behind.
      await supabase.from("appointments").delete().eq("id", data.id);
      throw new Error(svcError.message);
    }
  }
  return getAppointment(data.id);
}

/**
 * Move a visit to its next step. Each step records its time:
 * arrived -> arrived_at, waiting -> wait_started_at, in-room -> seen_at.
 * Completing goes through complete_appointment, which awards points once.
 */
export async function updateAppointmentStatus(
  id: string,
  status: UiStatus
): Promise<{ appointment: UiAppointment; pointsAwarded: number }> {
  if (status === "completed") {
    const { data, error } = await supabase.rpc("complete_appointment", { p_appointment_id: id });
    check(error);
    return { appointment: await getAppointment(id), pointsAwarded: Number(data ?? 0) };
  }

  const now = new Date().toISOString();
  const updates: Record<string, unknown> = { status: toDbStatus(status) };
  if (status === "arrived") updates.arrived_at = now;
  if (status === "waiting") updates.wait_started_at = now;
  if (status === "in-room") updates.seen_at = now;

  const { error } = await supabase.from("appointments").update(updates).eq("id", id);
  check(error);
  return { appointment: await getAppointment(id), pointsAwarded: 0 };
}

export async function deleteAppointment(id: string) {
  const { error } = await supabase.from("appointments").delete().eq("id", id);
  check(error);
}

/** Use a reward code at booking. Marks it used; returns what it gives. */
export async function redeemRewardCode(practiceId: string, code: string) {
  const { data, error } = await supabase.rpc("redeem_reward_code", {
    p_practice_id: practiceId,
    p_code: code,
  });
  check(error);
  const r = (data ?? [])[0];
  if (!r) throw new Error("Invalid reward code");
  return r as {
    claim_id: string;
    reward_id: string;
    reward_name: string;
    reward_type: "free" | "discount";
    service_id: string | null;
    product_id: string | null;
    discount_percentage: number | null;
    patient_id: string;
  };
}

/** Check a reward code without using it up (e.g. while filling in a form). */
export async function lookupRewardCode(practiceId: string, code: string) {
  const { data, error } = await supabase
    .from("reward_claims")
    .select("id, is_redeemed, patient_id, reward:rewards(id, name, type, service_id, product_id, discount_percentage)")
    .eq("practice_id", practiceId)
    .eq("redemption_code", code.trim().toUpperCase())
    .maybeSingle();
  check(error);
  if (!data) throw new Error("Invalid reward code");
  if (data.is_redeemed) throw new Error("This reward code has already been used");
  const reward: any = Array.isArray(data.reward) ? data.reward[0] : data.reward;
  return {
    claim_id: data.id as string,
    patient_id: data.patient_id as string,
    reward_id: reward.id as string,
    reward_name: reward.name as string,
    reward_type: reward.type as "free" | "discount",
    service_id: reward.service_id as string | null,
    product_id: reward.product_id as string | null,
    discount_percentage: reward.discount_percentage === null ? null : Number(reward.discount_percentage),
  };
}

/** Save a booking from the form, then use up its reward code, if it has one. */
export async function bookAppointment(
  practiceId: string,
  a: NewAppointment & { reward_code?: string }
): Promise<UiAppointment> {
  if (a.reward_code) {
    // Check first so a bad code doesn't leave a booking half-made.
    await lookupRewardCode(practiceId, a.reward_code);
  }
  const appointment = await createAppointment(practiceId, a);
  if (a.reward_code) {
    await redeemRewardCode(practiceId, a.reward_code);
  }
  return appointment;
}
