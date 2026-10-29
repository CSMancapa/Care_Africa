export interface Appointment {
  _id?: string;
  uid: string;
  patientId: string;
  patientName: string;
  type: string;
  date: Date;
  duration: number;
  contactNumber: string;
  email: string;
  notes?: string;
  assignedDoctor: string;
  doctorId?: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'walk-in';
  source: 'internal' | 'external';
  waitTime?: number;
  consultationDuration?: number;
  caseId?: string;
  checkInTime: Date;
}

export interface Notification {
  id: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  timestamp: Date;
  read: boolean;
}

export interface TimeSlot {
  start: Date;
  end: Date;
  available: boolean;
}

export type MessageType = 'default' | 'medical_response' | 'warning' | 'recommendation' | 'info';

export type MessageMetadata = {
  severity?: string;
  recommendations?: string[];
  references?: Array<{ url: string; title: string }>;
};

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  type?: 'text' | 'medical_response' | 'image_analysis';
  metadata?: MedicalResponse;
  files?: string[];  // For file URLs
  attachments?: Attachment[];
}

export interface Attachment {
  id: string;
  url: string;
  type: string;
  name: string;
}

export type QuickReply = {
  id: string;
  text: string;
  category: 'diagnosis' | 'prescription' | 'followup' | 'general';
};

export type PatientStatus = 'waiting' | 'ready' | 'in-room' | 'complete';

export interface PatientTracking {
  _id?: string;
  id: string;
  appointmentId?: string;
  patientId: string;
  patientName: string;
  scheduledTime: Date;
  checkInTime?: Date;
  startTime?: Date;
  endTime?: Date;
  status: PatientStatus;
  expectedDuration: number; // in minutes
}

export interface DetailedItem {
  main: string;
  details: string;
}

export interface PatientProfile {
  presentation: string;
  relevantHistory: string;
  riskFactors: string[];
}

export interface Diagnostic {
  Procedure: string;
  Details?: string;
}

export interface MedicalResponse {
  patientProfile: {
    presentation: string;
    relevantHistory?: string;
    riskFactors?: string[];
  };
  summary: string;
  symptoms: string[];
  possibleCauses: string[];
  diagnostics: (string | { Procedure: string; Details?: string })[];
  treatment: {
    immediateAction: string[];
    longTerm: string[];
  };
  followUp: string[];
  patientEducation: string[];
}

export const doctorService = {
  getDoctors: async (practiceId: string) => {
    const response = await fetch(`/api/doctors?practiceId=${practiceId}`);
    if (!response.ok) throw new Error('Failed to fetch doctors');
    return response.json();
  }
};

export interface Case {
  _id?: string;
  patientId: string;
  patientName: string;
  initialAppointmentId: string;
  status: 'open' | 'in-progress' | 'closed';
  referrals: string[];
  notes: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Patient {
  id: string;
  uid: string;
  name: string;
  email?: string;
}