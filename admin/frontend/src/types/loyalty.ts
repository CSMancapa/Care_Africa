export interface CustomRule {
  triggerType: string;
  pointsAwarded: number;
}

export interface Reward {
  name: string;
  pointsRequired: number;
  rewardType: string;
  quantity?: number;
  redemptionRules?: string;
}

export interface LoyaltyProgram {
  _id: string;
  name: string;
  description?: string;
  startDate: Date;
  endDate?: Date;
  status: 'active' | 'inactive';
  pointsPerVisit: number;
  pointsPerReferral: number;
  rewardThreshold: number;
  rewardValue: number;
  pointValidity: number;
  enrollmentCap?: number;
  autoEnroll: boolean;
  notificationsEnabled: boolean;
  termsAndConditions?: string;
  customRules?: CustomRule[];
  rewards?: Reward[];
  eligibilityCriteria?: string[];
  notificationSettings?: {
    earnPoints: boolean;
    rewardsAvailable: boolean;
    pointsExpiring: boolean;
    channels: {
      email: boolean;
      sms: boolean;
      push: boolean;
    };
  };
  messageTemplate?: string;
  terms?: string;
  pointsExpiration: number;
} 