import type { PracticeRole } from "@/context/PracticeContext";

/** How each practice role is named and explained in the app. */
export const ROLE_INFO: Record<PracticeRole, { label: string; description: string }> = {
  practice_admin: {
    label: "Practice admin",
    description: "Everything, including settings, branding, modules and the team.",
  },
  doctor: {
    label: "Practitioner",
    description: "Appointments, members and clinical records.",
  },
  staff: {
    label: "Front desk",
    description: "Bookings, check-in, members and sales. No clinical records.",
  },
};

export const ROLE_ORDER: PracticeRole[] = ["staff", "doctor", "practice_admin"];

/** Practitioners and admins can open clinical records; front desk can't. */
export function canSeeClinical(role: PracticeRole | null | undefined): boolean {
  return role === "doctor" || role === "practice_admin";
}
