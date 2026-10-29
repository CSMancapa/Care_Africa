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
}

export interface AppointmentData {
  time: string;
  status: 'scheduled' | 'arrived' | 'waiting' | 'in-room' | 'completed' | 'cancelled' | 'requested';
  patient: string;
  patient_email: string;
  patient_phone: string;
  practice_id: string;
  services: {
    id: string;
    name: string;
    price: number;
    description: string;
  }[];
  created_at?: string;
  updated_at?: string;
  patient_id?: string;
  doctor_id: string;
  applied_rewards?: Array<{
    service_id: string;
    redemption_code: string;
  }>;
}