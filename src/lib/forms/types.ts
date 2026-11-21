/**
 * Care Africa form templates: one format for clinical notes and intake
 * forms. A record keeps a copy of the template it was filled in on
 * (migration 0010), so a template can be improved later (new version)
 * without changing what earlier records asked.
 */

interface FieldBase {
  id: string;
  label: string;
  help?: string;
  required?: boolean;
}

export type Field =
  | (FieldBase & { type: "text"; placeholder?: string })
  | (FieldBase & { type: "textarea"; placeholder?: string; rows?: number })
  | (FieldBase & { type: "number"; unit?: string; min?: number; max?: number; step?: number })
  | (FieldBase & { type: "date" })
  | (FieldBase & { type: "time" })
  | (FieldBase & { type: "select"; options: string[] })
  | (FieldBase & { type: "checkboxes"; options: string[]; noneOption?: string })
  | (FieldBase & { type: "yesno"; detailsLabel?: string; detailsWhen?: "yes" | "no" })
  | (FieldBase & { type: "vitals" })
  | (FieldBase & { type: "rows"; columns: { id: string; label: string; type?: "text" | "date" | "number"; placeholder?: string }[]; addLabel: string });

export interface Section {
  id: string;
  title: string;
  description?: string;
  fields: Field[];
}

export interface FormTemplate {
  key: string;
  version: number;
  kind: "clinical_note" | "intake";
  title: string;
  description: string;
  /** Practice type ids (src/lib/practiceTypes.ts) this suits best. Empty = everyone. */
  suggestedFor: string[];
  sections: Section[];
  /** Intake forms: what the client agrees to. "{practice}" is replaced with the practice name. */
  consent?: string;
}

/* Answer shapes, by field type */
export type YesNoAnswer = { answer?: "yes" | "no"; details?: string };
export type Vitals = Partial<
  Record<"bp_systolic" | "bp_diastolic" | "pulse" | "temperature" | "resp_rate" | "spo2" | "glucose" | "weight" | "height", string>
>;
export type Row = Record<string, string>;
export type AnswerValue = string | string[] | YesNoAnswer | Vitals | Row[] | undefined;
export type Answers = Record<string, AnswerValue>;

export const VITALS: { id: keyof Vitals; label: string; unit: string }[] = [
  { id: "bp_systolic", label: "BP systolic", unit: "mmHg" },
  { id: "bp_diastolic", label: "BP diastolic", unit: "mmHg" },
  { id: "pulse", label: "Pulse", unit: "bpm" },
  { id: "temperature", label: "Temperature", unit: "°C" },
  { id: "resp_rate", label: "Breathing rate", unit: "/min" },
  { id: "spo2", label: "Oxygen saturation", unit: "%" },
  { id: "glucose", label: "Blood glucose", unit: "mmol/L" },
  { id: "weight", label: "Weight", unit: "kg" },
  { id: "height", label: "Height", unit: "cm" },
];

/** Is this answer filled in? */
export function isAnswered(field: Field, value: AnswerValue): boolean {
  if (value === undefined || value === null) return false;
  switch (field.type) {
    case "checkboxes":
      return Array.isArray(value) && value.length > 0;
    case "yesno":
      return !!(value as YesNoAnswer).answer;
    case "vitals":
      return Object.values((value as Vitals) ?? {}).some((v) => v !== undefined && String(v).trim() !== "");
    case "rows":
      return Array.isArray(value) && (value as Row[]).some((r) => Object.values(r).some((v) => String(v ?? "").trim() !== ""));
    default:
      return String(value).trim() !== "";
  }
}

/** Required fields that are still empty. */
export function missingRequired(template: FormTemplate, answers: Answers): Field[] {
  const missing: Field[] = [];
  for (const s of template.sections) {
    for (const f of s.fields) {
      if (f.required && !isAnswered(f, answers[f.id])) missing.push(f);
      // "Yes, and tell us more": details are needed when the answer calls for them.
      if (f.type === "yesno" && f.detailsLabel) {
        const v = answers[f.id] as YesNoAnswer | undefined;
        if (v?.answer === (f.detailsWhen ?? "yes") && !(v.details ?? "").trim()) missing.push({ ...f, label: f.detailsLabel });
      }
    }
  }
  return missing;
}
