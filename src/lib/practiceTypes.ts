import {
  Smile,
  Glasses,
  Accessibility,
  Bone,
  Dumbbell,
  Brain,
  Salad,
  Stethoscope,
  Sparkles,
  Droplets,
  HeartPulse,
  Leaf,
  Flower2,
  Scissors,
  CircleEllipsis,
  type LucideIcon,
} from "lucide-react";
import type { ClinicalLevel } from "@/lib/modules";

/**
 * The kinds of practice Care Africa serves, and the modules each one
 * starts with. Picking a type only sets defaults: the practice admin can
 * change the modules afterwards in Settings → Modules, within the limits
 * of the plan.
 *
 * The ids are stored in practices.category. Migration 0006 maps older
 * free-text values onto these ids, so keep the two lists in step.
 */

export type PracticeTypeGroup = "medical_aid" | "cash_clinical" | "wellness";

export interface PracticeType {
  id: string;
  name: string;
  /** Who this covers, for the picker. */
  examples: string;
  icon: LucideIcon;
  group: PracticeTypeGroup;
  defaults: {
    clinicalRecords: ClinicalLevel;
    /** Whether medical-aid claims are switched on when that module is released. */
    claims: boolean;
  };
}

export const PRACTICE_TYPE_GROUPS: { id: PracticeTypeGroup; title: string; description: string }[] = [
  {
    id: "medical_aid",
    title: "Clinical practices that claim from medical aids",
    description: "Full clinical notes, with medical-aid claims as they become available.",
  },
  {
    id: "cash_clinical",
    title: "Cash-based clinical practices",
    description: "Medical-grade records (consent, prescriptions, batch numbers), paid in cash or card.",
  },
  {
    id: "wellness",
    title: "Wellness and beauty",
    description: "Bookings, loyalty and retail, with simple client intake forms.",
  },
];

export const PRACTICE_TYPES: PracticeType[] = [
  // Medical-aid practices
  { id: "dental", name: "Dentist", examples: "General and cosmetic dentistry, orthodontics", icon: Smile, group: "medical_aid", defaults: { clinicalRecords: "full", claims: true } },
  { id: "optometry", name: "Optometrist", examples: "Eye tests, spectacles and contact lenses", icon: Glasses, group: "medical_aid", defaults: { clinicalRecords: "full", claims: true } },
  { id: "physio", name: "Physiotherapist", examples: "Rehab, sports injuries, post-op care", icon: Accessibility, group: "medical_aid", defaults: { clinicalRecords: "full", claims: true } },
  { id: "biokinetics", name: "Biokineticist", examples: "Exercise rehabilitation and conditioning", icon: Dumbbell, group: "medical_aid", defaults: { clinicalRecords: "full", claims: true } },
  { id: "chiro", name: "Chiropractor", examples: "Spinal and musculoskeletal care", icon: Bone, group: "medical_aid", defaults: { clinicalRecords: "full", claims: true } },
  { id: "psychology", name: "Psychologist or counsellor", examples: "Therapy and counselling sessions", icon: Brain, group: "medical_aid", defaults: { clinicalRecords: "full", claims: true } },
  { id: "nutrition", name: "Dietitian", examples: "Nutrition assessments and plans", icon: Salad, group: "medical_aid", defaults: { clinicalRecords: "full", claims: true } },
  { id: "medical", name: "GP or medical practice", examples: "General practitioners and doctors", icon: Stethoscope, group: "medical_aid", defaults: { clinicalRecords: "full", claims: true } },

  // Cash-based clinical
  { id: "aesthetics", name: "Aesthetics clinic", examples: "Injectables, fillers, skin treatments", icon: Sparkles, group: "cash_clinical", defaults: { clinicalRecords: "full", claims: false } },
  { id: "iv_therapy", name: "IV drip clinic", examples: "Vitamin and hydration infusions", icon: Droplets, group: "cash_clinical", defaults: { clinicalRecords: "full", claims: false } },
  { id: "nurse_clinic", name: "Nurse-led clinic", examples: "Primary care, family planning, chronic care", icon: HeartPulse, group: "cash_clinical", defaults: { clinicalRecords: "full", claims: false } },
  { id: "alternative", name: "Natural and complementary health", examples: "Homeopathy, naturopathy, acupuncture", icon: Leaf, group: "cash_clinical", defaults: { clinicalRecords: "full", claims: false } },

  // Wellness and beauty
  { id: "wellness", name: "Massage and spa", examples: "Massage, day spa, wellness studio", icon: Flower2, group: "wellness", defaults: { clinicalRecords: "intake", claims: false } },
  { id: "beauty", name: "Beauty salon", examples: "Skin, nails, lashes, brows", icon: Scissors, group: "wellness", defaults: { clinicalRecords: "intake", claims: false } },
  { id: "other", name: "Something else", examples: "You can choose your modules yourself", icon: CircleEllipsis, group: "wellness", defaults: { clinicalRecords: "intake", claims: false } },
];

export function getPracticeType(id: string | null | undefined): PracticeType {
  return PRACTICE_TYPES.find((t) => t.id === id) ?? PRACTICE_TYPES.find((t) => t.id === "other")!;
}
