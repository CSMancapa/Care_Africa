import { supabase } from "@/config/supabase";
import type { Answers, FormTemplate } from "@/lib/forms/types";

function fail(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

type Person = { full_name: string | null; email: string | null } | null;
const personName = (p: Person) => p?.full_name || p?.email || "Someone";

/* -------------------------------------------------------------------- */
/* Clinical notes                                                        */
/* -------------------------------------------------------------------- */

export interface NoteSummary {
  id: string;
  title: string;
  status: "draft" | "signed";
  createdAt: string;
  signedAt: string | null;
  authorId: string;
  authorName: string;
  addendaCount: number;
}

export interface Addendum {
  id: string;
  reason: string;
  body: string;
  createdAt: string;
  authorName: string;
}

export interface Note extends NoteSummary {
  patientId: string;
  practiceId: string;
  template: FormTemplate;
  answers: Answers;
  signedByName: string | null;
  addenda: Addendum[];
}

export async function listNotes(patientId: string): Promise<NoteSummary[]> {
  const { data, error } = await supabase
    .from("clinical_notes")
    .select(
      "id, title, status, created_at, signed_at, author_id, author:profiles!clinical_notes_author_id_fkey(full_name, email), clinical_note_addenda(count)"
    )
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false });
  fail(error);
  type Row = {
    id: string; title: string; status: "draft" | "signed"; created_at: string; signed_at: string | null;
    author_id: string; author: Person; clinical_note_addenda: { count: number }[];
  };
  return ((data ?? []) as unknown as Row[]).map((r) => ({
    id: r.id,
    title: r.title,
    status: r.status,
    createdAt: r.created_at,
    signedAt: r.signed_at,
    authorId: r.author_id,
    authorName: personName(r.author),
    addendaCount: r.clinical_note_addenda?.[0]?.count ?? 0,
  }));
}

export async function getNote(noteId: string): Promise<Note> {
  const { data, error } = await supabase
    .from("clinical_notes")
    .select(
      `id, practice_id, patient_id, title, status, created_at, signed_at, author_id, template, answers,
       author:profiles!clinical_notes_author_id_fkey(full_name, email),
       signer:profiles!clinical_notes_signed_by_fkey(full_name, email),
       clinical_note_addenda(id, reason, body, created_at, author:profiles(full_name, email))`
    )
    .eq("id", noteId)
    .single();
  fail(error);
  type Row = {
    id: string; practice_id: string; patient_id: string; title: string; status: "draft" | "signed"; created_at: string;
    signed_at: string | null; author_id: string; template: FormTemplate; answers: Answers; author: Person; signer: Person;
    clinical_note_addenda: { id: string; reason: string; body: string; created_at: string; author: Person }[];
  };
  const r = data as unknown as Row;
  const addenda = [...(r.clinical_note_addenda ?? [])]
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map((a) => ({ id: a.id, reason: a.reason, body: a.body, createdAt: a.created_at, authorName: personName(a.author) }));
  return {
    id: r.id,
    practiceId: r.practice_id,
    patientId: r.patient_id,
    title: r.title,
    status: r.status,
    createdAt: r.created_at,
    signedAt: r.signed_at,
    authorId: r.author_id,
    authorName: personName(r.author),
    signedByName: r.signer ? personName(r.signer) : null,
    template: r.template,
    answers: r.answers ?? {},
    addenda,
    addendaCount: addenda.length,
  };
}

/** Start a note (as a draft, or signed straight away). Returns its id. */
export async function createNote(
  practiceId: string,
  patientId: string,
  template: FormTemplate,
  answers: Answers,
  sign = false
): Promise<string> {
  const { data: u } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("clinical_notes")
    .insert({
      practice_id: practiceId,
      patient_id: patientId,
      author_id: u.user?.id,
      template_key: template.key,
      template_version: template.version,
      template,
      title: template.title,
      answers,
      status: sign ? "signed" : "draft",
    })
    .select("id")
    .single();
  fail(error);
  return (data as { id: string }).id;
}

export async function saveDraft(noteId: string, answers: Answers) {
  const { error } = await supabase.from("clinical_notes").update({ answers }).eq("id", noteId);
  fail(error);
}

export async function signNote(noteId: string, answers: Answers) {
  const { error } = await supabase.from("clinical_notes").update({ answers, status: "signed" }).eq("id", noteId);
  fail(error);
}

export async function deleteDraft(noteId: string) {
  const { error } = await supabase.from("clinical_notes").delete().eq("id", noteId);
  fail(error);
}

export async function addAddendum(noteId: string, reason: string, body: string) {
  const { data: u } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("clinical_note_addenda")
    .insert({ note_id: noteId, author_id: u.user?.id, reason: reason.trim(), body: body.trim() });
  fail(error);
}

/* -------------------------------------------------------------------- */
/* Intake forms                                                          */
/* -------------------------------------------------------------------- */

export interface IntakeSubmission {
  id: string;
  title: string;
  template: FormTemplate;
  answers: Answers;
  submittedAt: string;
  source: "in_practice" | "link";
  signedName: string;
  consentText: string;
  collectedByName: string | null;
}

/** Full submissions with answers (practitioners and admins only). */
export async function listIntakeSubmissions(patientId: string): Promise<IntakeSubmission[]> {
  const { data, error } = await supabase
    .from("intake_submissions")
    .select("id, title, template, answers, submitted_at, source, signed_name, consent_text, collector:profiles(full_name, email)")
    .eq("patient_id", patientId)
    .order("submitted_at", { ascending: false });
  fail(error);
  type Row = {
    id: string; title: string; template: FormTemplate; answers: Answers; submitted_at: string;
    source: "in_practice" | "link"; signed_name: string; consent_text: string; collector: Person;
  };
  return ((data ?? []) as unknown as Row[]).map((r) => ({
    id: r.id,
    title: r.title,
    template: r.template,
    answers: r.answers ?? {},
    submittedAt: r.submitted_at,
    source: r.source,
    signedName: r.signed_name,
    consentText: r.consent_text,
    collectedByName: r.collector ? personName(r.collector) : null,
  }));
}

export interface IntakeOverviewItem {
  kind: "submission" | "link";
  id: string;
  templateKey: string;
  title: string;
  at: string;
  source: string;
  status: "completed" | "waiting" | "expired" | "cancelled";
  expiresAt: string | null;
}

/** Which forms a member has completed or been sent, without the answers (any team member). */
export async function intakeOverview(patientId: string): Promise<IntakeOverviewItem[]> {
  const { data, error } = await supabase.rpc("intake_overview", { p_patient: patientId });
  fail(error);
  type Row = { kind: "submission" | "link"; id: string; template_key: string; title: string; at: string; source: string; status: IntakeOverviewItem["status"]; expires_at: string | null };
  return ((data ?? []) as Row[]).map((r) => ({
    kind: r.kind, id: r.id, templateKey: r.template_key, title: r.title, at: r.at, source: r.source, status: r.status, expiresAt: r.expires_at,
  }));
}

/** The client filled it in on a practice device. */
export async function submitIntakeInPractice(
  practiceId: string,
  patientId: string,
  template: FormTemplate,
  answers: Answers,
  consentText: string,
  signedName: string
) {
  const { data: u } = await supabase.auth.getUser();
  const { error } = await supabase.from("intake_submissions").insert({
    practice_id: practiceId,
    patient_id: patientId,
    template_key: template.key,
    template_version: template.version,
    template,
    title: template.title,
    answers,
    consent_given: true,
    consent_text: consentText,
    signed_name: signedName.trim(),
    source: "in_practice",
    collected_by: u.user?.id,
  });
  fail(error);
}

export async function createIntakeLink(patientId: string, template: FormTemplate) {
  const { data, error } = await supabase.rpc("create_intake_link", {
    p_patient: patientId,
    p_template_key: template.key,
    p_title: template.title,
  });
  fail(error);
  const row = (Array.isArray(data) ? data[0] : data) as { token: string; expires_at: string };
  return { link: `${window.location.origin}/intake/${row.token}`, expiresAt: row.expires_at };
}

export interface IntakeLinkInfo {
  status: "pending" | "completed" | "expired" | "cancelled" | "invalid";
  template_key?: string;
  title?: string;
  first_name?: string | null;
  practice_name?: string;
  logo_url?: string | null;
  brand_primary_color?: string | null;
  brand_accent_color?: string | null;
  expires_at?: string;
}

export async function getIntakeLink(token: string): Promise<IntakeLinkInfo> {
  const { data, error } = await supabase.rpc("get_intake_link", { p_token: token });
  fail(error);
  return (data ?? { status: "invalid" }) as IntakeLinkInfo;
}

export async function submitIntakeLink(token: string, template: FormTemplate, answers: Answers, consentText: string, signedName: string) {
  const { error } = await supabase.rpc("submit_intake_link", {
    p_token: token,
    p_template: template,
    p_answers: answers,
    p_consent_text: consentText,
    p_signed_name: signedName.trim(),
  });
  fail(error);
}
