export type PracticeCategory = string;

export interface PracticeCategoryOption {
  id: string;
  name: string;
  icon: string;
}

export interface PracticeData {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  province: string;
  postal_code: string;
  display_picture: string | null;
  category: string;
  business_hours?: BusinessHours;
  services?: ServicePrice[];
  rewards?: any; // Define specific reward types as needed
  accepted_insurances?: string[];
  specialties?: string[];
  doctors?: DoctorProfile[];
  percentage_reward?: number;
  referral_points?: number;
}

export type BusinessHours = {
  [key in 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday']: {
    start: string;
    end: string;
    isOpen: boolean;
  };
};

export interface ServicePrice {
  name: string;
  price: number;
  description?: string;
}

export interface DoctorProfile {
  name: string;
  specialization: string;
  availability: {
    [key: string]: DoctorAvailability;
  };
}

export interface DoctorAvailability {
  isAvailable: boolean;
  usePracticeHours: boolean;
  customHours: {
    start: string;
    end: string;
  };
} 