export interface Patient {
  id: string;
  name: string;
  email: string;
  status: string;
  practice_id: string;
  created_at: string;
  appointmentCount?: number;
  points: number;
  appointments?: Array<{
    time: string | Date;
    // ... other appointment properties ...
  }>;
  rewardPoints?: number;
  lastVisit?: string;
  visitCount?: number;
  dateOfBirth: string;
  contact_number: string;
  address: string;
  rewardClaims?: number[];
  reward_claims?: {
    reward_id: string;
    reward_name: string;
    points_used: number;
    claimed_at: string;
  }[];
} 