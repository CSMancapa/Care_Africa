import type { FormTemplate } from "./types";

/**
 * The templates Care Africa provides. These are starting points, to be
 * checked against founding practices' own paper forms and the HPCSA's
 * record-keeping guidance (Booklet 9) before go-live.
 *
 * To change a template: copy it, raise `version`, and edit the copy.
 * Records keep the version they were filled in on.
 */

const PREGNANCY = ["No", "Yes, pregnant", "Breastfeeding", "Trying to fall pregnant", "Not sure", "Not applicable"];

const DEFAULT_CONSENT =
  "I confirm that the information I've given is true and complete, as far as I know. I agree that {practice} may keep " +
  "and use it to give me safe care. It will be kept confidential and only shared with the people caring for me, " +
  "or where the law requires it. I'll tell the practice if anything changes.";

/* -------------------------------------------------------------------- */
/* Clinical notes                                                        */
/* -------------------------------------------------------------------- */

export const SOAP_CONSULTATION: FormTemplate = {
  key: "soap_consultation",
  version: 1,
  kind: "clinical_note",
  title: "General consultation",
  description: "A standard consultation note: what the patient says, what you find, your assessment and the plan (SOAP).",
  suggestedFor: [],
  sections: [
    {
      id: "subjective",
      title: "Subjective",
      description: "What the patient tells you.",
      fields: [
        { id: "complaint", type: "text", label: "Reason for visit", required: true, placeholder: "e.g. Lower back pain for 2 weeks" },
        { id: "history", type: "textarea", label: "History of the complaint", rows: 4 },
        { id: "current_medication", type: "textarea", label: "Current medicines", rows: 2 },
        { id: "allergies", type: "yesno", label: "Allergies?", detailsLabel: "Allergic to what, and what happens?" },
      ],
    },
    {
      id: "objective",
      title: "Objective",
      description: "What you observe and measure.",
      fields: [
        { id: "vitals", type: "vitals", label: "Vitals" },
        { id: "examination", type: "textarea", label: "Examination findings", rows: 5 },
      ],
    },
    {
      id: "assessment",
      title: "Assessment",
      fields: [
        { id: "assessment", type: "textarea", label: "Assessment or diagnosis", required: true, rows: 3 },
        { id: "icd10", type: "text", label: "ICD-10 code(s)", help: "Needed for medical-aid claims.", placeholder: "e.g. M54.5" },
      ],
    },
    {
      id: "plan",
      title: "Plan",
      fields: [
        { id: "plan", type: "textarea", label: "Treatment and plan", required: true, rows: 4 },
        {
          id: "medicines",
          type: "rows",
          label: "Medicines prescribed or given",
          addLabel: "Add a medicine",
          columns: [
            { id: "medicine", label: "Medicine and strength", placeholder: "e.g. Ibuprofen 400 mg" },
            { id: "dose", label: "Dose and how often", placeholder: "e.g. 1 tablet 3 times a day" },
            { id: "duration", label: "For how long", placeholder: "e.g. 5 days" },
            { id: "quantity", label: "Quantity", placeholder: "e.g. 15" },
          ],
        },
        { id: "advice", type: "textarea", label: "Advice given to the patient", rows: 2 },
        { id: "referral", type: "text", label: "Referred to" },
        { id: "follow_up", type: "date", label: "Follow-up date" },
      ],
    },
  ],
};

export const TREATMENT_RECORD: FormTemplate = {
  key: "treatment_record",
  version: 1,
  kind: "clinical_note",
  title: "Treatment record (aesthetics / IV)",
  description: "For injectables, fillers, skin treatments and IV infusions: consent, products and batch numbers, vitals before and after, and any reaction.",
  suggestedFor: ["aesthetics", "iv_therapy", "nurse_clinic"],
  sections: [
    {
      id: "before",
      title: "Before treatment",
      fields: [
        {
          id: "treatment",
          type: "select",
          label: "Treatment",
          required: true,
          options: ["IV infusion", "Vitamin injection", "Botulinum toxin", "Dermal filler", "Skin treatment or peel", "Other"],
        },
        { id: "protocol", type: "text", label: "Protocol or treatment name", placeholder: "e.g. Hydration drip with vitamin C" },
        { id: "intake_reviewed", type: "yesno", label: "Intake form reviewed and contraindications checked?", required: true, detailsLabel: "Why not?", detailsWhen: "no" },
        { id: "consent", type: "yesno", label: "Written consent obtained for this treatment?", required: true, detailsLabel: "Why not?", detailsWhen: "no" },
        { id: "prescriber", type: "text", label: "Prescribed or authorised by", help: "Name and registration number.", required: true },
        { id: "vitals_before", type: "vitals", label: "Vitals before" },
      ],
    },
    {
      id: "products",
      title: "Products used",
      fields: [
        {
          id: "products",
          type: "rows",
          label: "Products",
          required: true,
          addLabel: "Add a product",
          columns: [
            { id: "product", label: "Product", placeholder: "e.g. Sodium chloride 0.9%" },
            { id: "batch", label: "Batch / lot no." },
            { id: "expiry", label: "Expiry", type: "date" },
            { id: "amount", label: "Dose or volume", placeholder: "e.g. 1000 ml / 20 units" },
            { id: "site", label: "Route or site", placeholder: "e.g. IV left forearm" },
          ],
        },
      ],
    },
    {
      id: "procedure",
      title: "Procedure",
      fields: [
        { id: "access", type: "text", label: "Cannula size and site", help: "For IV treatments.", placeholder: "e.g. 22G left antecubital" },
        { id: "start_time", type: "time", label: "Start time" },
        { id: "end_time", type: "time", label: "End time" },
        { id: "procedure_notes", type: "textarea", label: "Procedure notes", rows: 3 },
      ],
    },
    {
      id: "after",
      title: "After treatment",
      fields: [
        { id: "vitals_after", type: "vitals", label: "Vitals after" },
        { id: "reaction", type: "yesno", label: "Any adverse reaction?", required: true, detailsLabel: "What happened, and what was done?" },
        { id: "aftercare", type: "textarea", label: "Aftercare advice given", rows: 2 },
        { id: "follow_up", type: "date", label: "Follow-up date" },
      ],
    },
  ],
};

/* -------------------------------------------------------------------- */
/* Intake forms (filled in by the client)                                */
/* -------------------------------------------------------------------- */

export const GENERAL_HEALTH: FormTemplate = {
  key: "general_health",
  version: 1,
  kind: "intake",
  title: "Health questionnaire",
  description: "General health, medicines and allergies, before a first visit.",
  suggestedFor: [],
  consent: DEFAULT_CONSENT,
  sections: [
    {
      id: "conditions",
      title: "Your health",
      fields: [
        {
          id: "conditions",
          type: "checkboxes",
          label: "Do you have, or have you had, any of these?",
          noneOption: "None of these",
          options: [
            "Diabetes",
            "High blood pressure",
            "Heart condition",
            "Asthma or lung condition",
            "Epilepsy or seizures",
            "Bleeding or clotting problem",
            "Kidney or liver disease",
            "Cancer (now or in the past)",
            "HIV",
            "Mental health condition",
            "None of these",
          ],
        },
        { id: "other_conditions", type: "textarea", label: "Any other conditions, or operations in the last few years?", rows: 2 },
      ],
    },
    {
      id: "medicines",
      title: "Medicines and allergies",
      fields: [
        { id: "medicines", type: "yesno", label: "Do you take any medicines, supplements or herbal remedies?", required: true, detailsLabel: "Which ones?" },
        { id: "allergies", type: "yesno", label: "Are you allergic to anything (medicines, latex, plasters, foods)?", required: true, detailsLabel: "To what, and what happens?" },
        { id: "pregnancy", type: "select", label: "Are you pregnant or breastfeeding?", options: PREGNANCY },
        { id: "smoking", type: "select", label: "Do you smoke?", options: ["Never", "I used to", "Yes"] },
      ],
    },
    {
      id: "contact",
      title: "Contacts",
      fields: [
        { id: "emergency_contact", type: "text", label: "Emergency contact (name and phone number)", required: true },
        { id: "doctor", type: "text", label: "Your usual doctor (optional)" },
        { id: "anything_else", type: "textarea", label: "Anything else we should know?", rows: 2 },
      ],
    },
  ],
};

export const MASSAGE_SPA: FormTemplate = {
  key: "massage_spa",
  version: 1,
  kind: "intake",
  title: "Massage and spa health check",
  description: "Quick health check before a massage or spa treatment.",
  suggestedFor: ["wellness", "beauty", "physio", "chiro", "biokinetics"],
  consent: DEFAULT_CONSENT,
  sections: [
    {
      id: "health",
      title: "Your health",
      fields: [
        {
          id: "conditions",
          type: "checkboxes",
          label: "Do any of these apply to you right now?",
          noneOption: "None of these",
          options: [
            "Injury or operation in the last 3 months",
            "Blood clots or DVT",
            "Varicose veins",
            "Heart condition",
            "High or low blood pressure",
            "Skin condition, rash or open wound",
            "Diabetes",
            "Epilepsy",
            "Pregnant",
            "Having cancer treatment",
            "Fever or feeling unwell",
            "None of these",
          ],
        },
        { id: "medicines", type: "yesno", label: "Are you taking any medicines (including blood thinners)?", required: true, detailsLabel: "Which ones?" },
        { id: "allergies", type: "yesno", label: "Are you allergic to any oils, nuts, fragrances or skin products?", required: true, detailsLabel: "To what?" },
      ],
    },
    {
      id: "preferences",
      title: "Your treatment",
      fields: [
        { id: "pain", type: "textarea", label: "Any areas of pain or tension we should know about?", rows: 2 },
        { id: "avoid", type: "text", label: "Any areas you'd like us to avoid?" },
        { id: "pressure", type: "select", label: "Preferred pressure", options: ["Light", "Medium", "Firm", "Not sure"] },
      ],
    },
  ],
};

export const SKIN_BEAUTY: FormTemplate = {
  key: "skin_beauty",
  version: 1,
  kind: "intake",
  title: "Skin and beauty consultation",
  description: "Skin type, products and sensitivities before facials, peels and beauty treatments.",
  suggestedFor: ["beauty", "aesthetics"],
  consent: DEFAULT_CONSENT,
  sections: [
    {
      id: "skin",
      title: "Your skin",
      fields: [
        { id: "skin_type", type: "select", label: "How would you describe your skin?", options: ["Normal", "Dry", "Oily", "Combination", "Sensitive", "Not sure"] },
        {
          id: "concerns",
          type: "checkboxes",
          label: "What would you like help with?",
          options: ["Acne or breakouts", "Pigmentation or dark marks", "Fine lines", "Redness or rosacea", "Dryness", "Sensitivity", "Other"],
        },
        { id: "products", type: "textarea", label: "What do you use on your skin now?", rows: 2 },
      ],
    },
    {
      id: "safety",
      title: "Safety",
      fields: [
        {
          id: "actives",
          type: "yesno",
          label: "In the last 6 months, have you used retinol, Retin-A, Roaccutane or had a chemical peel?",
          required: true,
          detailsLabel: "Which, and when?",
        },
        { id: "allergies", type: "yesno", label: "Are you allergic to any products, latex or hair dye?", required: true, detailsLabel: "To what?" },
        { id: "past_reaction", type: "yesno", label: "Have you ever reacted to a beauty treatment?", detailsLabel: "What happened?" },
        { id: "sun", type: "select", label: "Sunburn, tanning or sunbeds in the last 2 weeks?", options: ["No", "Yes"] },
        { id: "pregnancy", type: "select", label: "Are you pregnant or breastfeeding?", options: PREGNANCY },
      ],
    },
  ],
};

export const AESTHETICS_IV_PRETREATMENT: FormTemplate = {
  key: "iv_pretreatment",
  version: 1,
  kind: "intake",
  title: "Before your treatment (aesthetics / IV)",
  description: "Medical history and safety questions before injectables, fillers or an IV drip.",
  suggestedFor: ["aesthetics", "iv_therapy", "nurse_clinic"],
  consent: DEFAULT_CONSENT,
  sections: [
    {
      id: "treatment",
      title: "Your treatment",
      fields: [
        { id: "reason", type: "text", label: "What would you like to have done?", required: true },
        { id: "before", type: "yesno", label: "Have you had this or a similar treatment before?", detailsLabel: "When, and how did it go?" },
      ],
    },
    {
      id: "health",
      title: "Your health",
      fields: [
        {
          id: "conditions",
          type: "checkboxes",
          label: "Do you have any of these?",
          noneOption: "None of these",
          options: [
            "Heart condition",
            "High blood pressure",
            "Kidney disease",
            "Liver disease",
            "Diabetes",
            "Bleeding disorder, or taking blood thinners",
            "Autoimmune condition",
            "G6PD deficiency",
            "Nerve or muscle condition (e.g. myasthenia gravis)",
            "Cold sores",
            "Keloid or raised scars",
            "None of these",
          ],
        },
        { id: "medicines", type: "yesno", label: "Do you take any medicines, supplements or herbal remedies?", required: true, detailsLabel: "Which ones?" },
        { id: "allergies", type: "yesno", label: "Are you allergic to anything (medicines, latex, eggs, plasters)?", required: true, detailsLabel: "To what, and what happens?" },
        { id: "bad_reaction", type: "yesno", label: "Have you ever reacted badly to an injection, drip or anaesthetic?", required: true, detailsLabel: "What happened?" },
        { id: "pregnancy", type: "select", label: "Are you pregnant or breastfeeding?", options: PREGNANCY, required: true },
        { id: "eaten", type: "select", label: "Have you eaten in the last 4 hours?", options: ["Yes", "No"] },
      ],
    },
    {
      id: "contact",
      title: "Contacts",
      fields: [{ id: "emergency_contact", type: "text", label: "Emergency contact (name and phone number)", required: true }],
    },
  ],
};

export const TEMPLATES: FormTemplate[] = [
  SOAP_CONSULTATION,
  TREATMENT_RECORD,
  GENERAL_HEALTH,
  MASSAGE_SPA,
  SKIN_BEAUTY,
  AESTHETICS_IV_PRETREATMENT,
];

export function getTemplate(key: string): FormTemplate | undefined {
  return TEMPLATES.find((t) => t.key === key);
}

/** Templates of one kind, the ones suggested for this practice type first. */
export function templatesFor(kind: FormTemplate["kind"], practiceType?: string | null) {
  const list = TEMPLATES.filter((t) => t.kind === kind);
  const suits = (t: FormTemplate) => !!practiceType && t.suggestedFor.includes(practiceType);
  return [...list.filter(suits), ...list.filter((t) => !suits(t))].map((t) => ({ template: t, suggested: suits(t) }));
}

export function consentText(template: FormTemplate, practiceName: string) {
  return (template.consent ?? DEFAULT_CONSENT).replace(/\{practice\}/g, practiceName);
}
