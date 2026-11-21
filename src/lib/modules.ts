import { usePractice } from "@/context/PracticeContext";
import { getPracticeType } from "@/lib/practiceTypes";

/**
 * Which features a practice gets.
 *
 * - The retention core (bookings, waiting room, members, loyalty, rewards,
 *   retail) is always on. It is what every practice buys Care Africa for.
 * - Clinical records: off, intake forms only, or full clinical notes.
 * - Medical-aid claims: a separate module.
 *
 * The plan sets the limits (also enforced in the database, migration 0006).
 * The practice type sets the defaults. The practice admin decides.
 */

export type ClinicalLevel = "off" | "intake" | "full";
export type Plan = "starter" | "practice" | "network";

export interface PracticeModules {
  clinicalRecords: ClinicalLevel;
  claims: boolean;
}

export const PLAN_NAMES: Record<Plan, string> = {
  starter: "Starter",
  practice: "Practice",
  network: "Network",
};

export const PLAN_LIMITS: Record<Plan, { maxClinical: ClinicalLevel; claims: boolean }> = {
  starter: { maxClinical: "intake", claims: false },
  practice: { maxClinical: "full", claims: true },
  network: { maxClinical: "full", claims: true },
};

const LEVEL_ORDER: ClinicalLevel[] = ["off", "intake", "full"];

export function clinicalAllowed(plan: Plan, level: ClinicalLevel): boolean {
  return LEVEL_ORDER.indexOf(level) <= LEVEL_ORDER.indexOf(PLAN_LIMITS[plan].maxClinical);
}

/**
 * Whether the screens behind each module have been released yet. A practice
 * can choose a module before then; the screens appear when they ship.
 * Flip these as each part is released.
 */
export const MODULE_RELEASED = {
  intake: true,
  clinicalNotes: true,
  claims: false,
} as const;

/** The modules a practice type starts with, trimmed to what the plan allows. */
export function recommendedModules(category: string | null | undefined, plan: Plan): PracticeModules {
  const { defaults } = getPracticeType(category);
  let clinicalRecords = defaults.clinicalRecords;
  if (!clinicalAllowed(plan, clinicalRecords)) clinicalRecords = PLAN_LIMITS[plan].maxClinical;
  return {
    clinicalRecords,
    // Claims stay off until the claims module is released, so nobody sees a
    // switched-on module that does nothing.
    claims: defaults.claims && PLAN_LIMITS[plan].claims && MODULE_RELEASED.claims,
  };
}

/** The current practice's modules, for showing or hiding features. */
export function useModules() {
  const { practice } = usePractice();
  const plan = (practice?.plan ?? "practice") as Plan;
  const clinicalRecords = (practice?.clinical_records ?? "off") as ClinicalLevel;
  const claims = !!practice?.claims_enabled;
  return {
    plan,
    clinicalRecords,
    claims,
    /** Intake forms or full notes. */
    hasClinical: clinicalRecords !== "off",
    hasFullClinical: clinicalRecords === "full",
    /** Medical aids matter for clinical practices, even before claims ship. */
    showsMedicalAids: clinicalRecords === "full" || claims,
  };
}
