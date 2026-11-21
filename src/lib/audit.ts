import { supabase } from "@/config/supabase";

/**
 * Reporting events to the practice's activity log (migration 0009). Most
 * entries are written by the database itself; these are the ones only the
 * app can see. Logging never blocks or breaks what the person is doing.
 */

export type AuthEvent =
  | "signed_in"
  | "two_step_failed"
  | "recovery_code_used"
  | "two_step_set_up"
  | "recovery_codes_renewed"
  | "password_changed";

export function logAuthEvent(event: AuthEvent) {
  void supabase.rpc("log_auth_event", { p_event: event }).then(({ error }) => {
    if (error && !/does not exist/i.test(error.message)) console.warn("Activity log:", error.message);
  });
}

export function logRecordView(patientId: string, what: "member_profile" | "clinical_record" = "member_profile") {
  void supabase.rpc("log_record_view", { p_patient: patientId, p_what: what }).then(({ error }) => {
    if (error && !/does not exist/i.test(error.message)) console.warn("Activity log:", error.message);
  });
}

export async function logExport(practiceId: string, what: "activity_log" | "members" | "sales" | "clinical", rows?: number) {
  const { error } = await supabase.rpc("log_export", { p_practice: practiceId, p_what: what, p_rows: rows ?? null });
  if (error && !/does not exist/i.test(error.message)) console.warn("Activity log:", error.message);
}

/** Record "Signed in" once per login session (not on every page). */
export async function logSignInOnce() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return;
  let sessionId: string | undefined;
  try {
    sessionId = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))).session_id;
  } catch {
    return;
  }
  if (!sessionId) return;
  const key = "ca-signins-logged";
  let seen: string[] = [];
  try {
    seen = JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    seen = [];
  }
  if (seen.includes(sessionId)) return;
  try {
    localStorage.setItem(key, JSON.stringify([...seen, sessionId].slice(-20)));
  } catch {
    // storage unavailable: still log, at worst twice
  }
  logAuthEvent("signed_in");
}
