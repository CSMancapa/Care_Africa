export interface Patient {
    _id: string;
    id: string;
    idNumber: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string | Date;
    gender: 'male' | 'female' | 'other';
    contactNumber: string;
    email: string;
    address: string;
    bloodType?: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
    allergies: string[];
    medications: Medication[];
    conditions: MedicalCondition[];
    visits: Visit[];
    currentMedications?: Medication[];
    chronicConditions?: Array<{
        condition: string;
        medication: string;
        dosage: string;
        frequency: string;
        startDate: string | Date;
        prescribedBy: string;
    }>;
    appointments?: {
        id: string;
        date: string | Date;
        type: string;
        notes?: string;
    }[];
    primaryDoctorId?: {
        name: string;
    };
    practitionerId: string;
  }
  
  export interface Medication {
    id: string;
    name: string;
    dosage: string;
    frequency: string;
    startDate: Date;
    endDate?: Date;
    prescribedBy: string;
    notes?: string;
    chronicCondition?: string;
  }
  
  export interface MedicalCondition {
    id: string;
    name: string;
    diagnosedDate: Date;
    status: 'active' | 'resolved' | 'managed';
    notes?: string;
  }
  
  export interface Visit {
    id: string;
    date: Date;
    type: 'check-up' | 'follow-up' | 'emergency' | 'consultation';
    chiefComplaint: string;
    diagnosis?: string;
    treatment?: string;
    notes?: string;
    vitals: Vitals;
    documents: Document[];
  }
  
  export interface Vitals {
    bloodPressure: string;
    heartRate: number;
    temperature: number;
    respiratoryRate?: number;
    weight: number;
    height: number;
    bmi: number;
  }
  
  export interface Document {
    id: string;
    type: 'lab_result' | 'prescription' | 'imaging' | 'report';
    title: string;
    date: Date;
    url: string;
  }
  
  export interface VisitTrend {
    month: string;
    count: number;
  }
  
  export interface ConditionStat {
    condition: string;
    count: number;
  }
  
  export interface MedicationAdherence {
    medication: string;
    adherenceRate: number;
  }
  
  export interface PatientStatistics {
    visitTrends: VisitTrend[];
    conditionStats: ConditionStat[];
    medicationAdherence: MedicationAdherence[];
  }
  
  export interface Appointment {
    id: string;
    patientId: string;
    patientName: string;
    date: Date;
    time: string;
    type: string;
    status: 'scheduled' | 'completed' | 'cancelled';
    notes?: string;
  }