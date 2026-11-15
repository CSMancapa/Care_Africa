export interface Service {
  name: string;
  price: number;
  description: string;  
}

export interface Appointment {
    id: string;
    patient: string;
    patient_email: string;
    patient_phone: string;
    time: string; // ISO string or formatted time
    status: "scheduled" | "arrived" | "waiting" | "in-room" | "completed" | "cancelled" | "requested";
    wait_start_time?: string | null;
    wait_duration?: string; // Format: "MM:SS"
    type?: string;
    practice_id: string;
    created_at: string;
    updated_at: string;
    wait_time?: string;
    services: (Service | string)[];
    patient_id?: string | null;
    doctor_id?: string | null;
    doctor_name?: string;
    notes?: string | null;
}

/** What the booking form hands to the page that saves it. */
export interface AppointmentData {
  /** Local date and time, "yyyy-MM-ddTHH:mm:ss". */
  time: string;
  patient: string;
  patient_email?: string;
  patient_phone?: string;
  /** Set when booking from a member's card; otherwise the member is found or added. */
  patient_id?: string;
  doctor_id?: string;
  /** Each service with the price charged after any reward. */
  services: { id: string; name: string; price: number }[];
  /** A reward code to use up when the booking is saved. */
  reward_code?: string;
  notes?: string;
}
