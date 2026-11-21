import { CalendarCheck2, Gift, ShoppingBag } from "lucide-react";
import type { ClinicalLevel } from "@/lib/modules";

/** Wording for the modules, shared by onboarding and Settings. */
export const CLINICAL_LEVEL_COPY: Record<ClinicalLevel, { title: string; body: string }> = {
  off: {
    title: "No clinical records",
    body: "Keep things simple: bookings, members and sales only.",
  },
  intake: {
    title: "Client intake forms",
    body: "Health questions, allergies and contraindications before a treatment, with the client's consent.",
  },
  full: {
    title: "Full clinical notes",
    body: "Consultation notes, vitals, prescriptions and treatment records (including consent and batch numbers), kept against each patient.",
  },
};

export const CORE_FEATURES = [
  { icon: CalendarCheck2, label: "Bookings and live waiting room" },
  { icon: Gift, label: "Members, loyalty points and rewards" },
  { icon: ShoppingBag, label: "Retail sales and stock" },
];
