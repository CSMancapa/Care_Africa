import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DashboardLayout } from "../components/Dashboard/DashboardLayout";
import { Award, Plus, Archive, ChartBar, Gift, ArrowRight, Coins, Star, Sparkles, Trophy, History, Users, Calendar, HelpCircle, Search } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { AddRewardTierModal } from "@/components/Rewards/AddRewardTierModal";
import { supabase } from "@/config/supabase";
import type { RewardItem } from '@/types/rewards';
import { useCurrentPractice } from '@/hooks/useCurrentPractice';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalFooter,
} from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Patient } from "@/types/patient";
import { format } from 'date-fns';

export interface Service {
  id: string;
  name: string;
  price: number;
  description: string;
  practice_id: string;
  created_at?: string;
  updated_at?: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  practice_id: string;
  current_stock: number;
  min_stock_level: number;
  sku: string;
  category: string;
}

const POINTS_TO_RAND_RATIO = 10; // 10 points = 1 ZAR

const calculatePointsForDiscount = (price: number, discountPercentage: number): number => {
  return Math.round((price * discountPercentage / 100) * POINTS_TO_RAND_RATIO);
};

const calculatePointsForFreeService = (price: number): number => {
  return price * POINTS_TO_RAND_RATIO;
};

const formatNumber = (num: number): string => {
  return new Intl.NumberFormat().format(num);
};

const RewardClaim = ({
  patient,
  reward,
  points,
  date,
  status,
  is_redeemed
}: {
  patient: string;
  reward: string;
  points: number;
  date: string;
  status: 'claimed' | 'redeemed';
  is_redeemed: boolean;
}) => (
  <div className="flex items-center justify-between p-4 bg-white rounded-lg hover:shadow-md transition-shadow border border-gray-100">
    <div className="flex items-center gap-4">
      <div className={`p-2.5 rounded-full ${
        is_redeemed ? 'bg-green-100' : 'bg-primary/10'
      }`}>
        <Award className={`w-5 h-5 ${
          is_redeemed ? 'text-green-600' : 'text-primary'
        }`} />
      </div>
      <div>
        <h4 className="font-medium text-gray-900">{patient}</h4>
        <p className="text-sm text-gray-600">{reward}</p>
      </div>
    </div>
    <div className="text-right">
      <div className="flex items-center gap-2 text-primary font-medium">
        <Coins className="w-4 h-4" />
        {points} points
      </div>
      <div className="flex items-center gap-2">
        <p className="text-sm text-gray-500">{date}</p>
        {is_redeemed && (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
            Redeemed
          </span>
        )}
      </div>
    </div>
  </div>
);

const RewardsMetrics = () => {
  const [totalPoints, setTotalPoints] = useState(0);
  const [totalRewards, setTotalRewards] = useState(0);
  const [totalClaims, setTotalClaims] = useState(0);
  const practiceId = useCurrentPractice();

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        // Fetch total rewards given from reward_claims
        const { data: claims, error: claimsError } = await supabase
          .from('reward_claims')
          .select('*')
          .eq('practice_id', practiceId);

        if (claimsError) throw claimsError;

        // Total claims (all rewards claimed)
        setTotalClaims(claims?.length || 0);

        // Count redeemed rewards
        const redeemedClaims = claims?.filter(claim => claim.is_redeemed) || [];
        setTotalRewards(redeemedClaims.length);
        
        // Calculate total points used in redeemed claims only
        const totalPointsUsed = redeemedClaims.reduce((sum, claim) => 
          sum + (claim.points_used || 0), 0);
        setTotalPoints(totalPointsUsed);
        
      } catch (error) {
        console.error('Error fetching metrics:', error);
      }
    };

    if (practiceId) {
      fetchMetrics();
    }
  }, [practiceId]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <Card className="p-6 hover:shadow-lg transition-shadow animate-scale-in">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-lg">
            <Award className="w-6 h-6 text-primary" />
          </div>
          <div>
            <p className="text-sm text-gray-600">Total Claims</p>
            <h3 className="text-2xl font-semibold text-gray-900">{formatNumber(totalClaims)}</h3>
          </div>
        </div>
      </Card>
      <Card className="p-6 hover:shadow-lg transition-shadow animate-scale-in delay-100">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-secondary/10 rounded-lg">
            <Coins className="w-6 h-6 text-secondary" />
          </div>
          <div>
            <p className="text-sm text-gray-600">Rewards Redeemed</p>
            <h3 className="text-2xl font-semibold text-gray-900">{formatNumber(totalRewards)}</h3>
          </div>
        </div>
      </Card>
      <Card className="p-6 hover:shadow-lg transition-shadow animate-scale-in delay-200">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-accent/10 rounded-lg">
            <ChartBar className="w-6 h-6 text-accent" />
          </div>
          <div>
            <p className="text-sm text-gray-600">Points Redeemed</p>
            <h3 className="text-2xl font-semibold text-gray-900">{formatNumber(totalPoints)}</h3>
          </div>
        </div>
      </Card>
    </div>
  );
};

interface RewardTierData {
  points: number;
  rewards: RewardItem[];
}

const ViewDetailsModal = ({ 
  isOpen, 
  onClose, 
  reward,
  service 
}: { 
  isOpen: boolean; 
  onClose: () => void;
  reward: RewardItem;
  service?: Service;
}) => {
  return (
    <Modal open={isOpen} onOpenChange={onClose}>
      <ModalContent className="max-w-2xl">
        <ModalHeader>
          <ModalTitle className="flex items-center gap-2 text-2xl">
            <Gift className="w-6 h-6" /> Reward Details
          </ModalTitle>
          <ModalDescription>
            View detailed information about this reward
          </ModalDescription>
        </ModalHeader>

        <div className="p-6 space-y-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-lg">
              {reward.type === 'discount' ? (
                <Coins className="w-6 h-6 text-primary" />
              ) : reward.type === 'free' ? (
                <Gift className="w-6 h-6 text-primary" />
              ) : (
                <Star className="w-6 h-6 text-primary" />
              )}
            </div>
            <div>
              <h3 className="text-xl font-semibold">{reward.name}</h3>
              <p className="text-sm text-gray-500">{reward.type.charAt(0).toUpperCase() + reward.type.slice(1)} Reward</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">Points Required</p>
              <p className="text-lg font-semibold flex items-center gap-2">
                <Star className="w-4 h-4 text-primary" /> 
                {reward.points_required}
              </p>
            </div>
            {reward.type === 'discount' && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Discount</p>
                <p className="text-lg font-semibold">{reward.discount_percentage}%</p>
              </div>
            )}
          </div>

          {service && (
            <div className="border-t pt-4">
              <h4 className="font-medium mb-2">Service Details</h4>
              <p className="text-sm text-gray-600">{service.description}</p>
              <p className="text-sm text-gray-500 mt-2">Price: R{service.price}</p>
            </div>
          )}
        </div>

        <ModalFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

const RewardCard = ({ reward, service, onArchive }: { 
  reward: RewardItem; 
  service?: Service; 
  onArchive: (id: string) => Promise<void>;
}) => {
  const [isArchiving, setIsArchiving] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showAwardModal, setShowAwardModal] = useState(false);

  const handleArchive = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsArchiving(true);
    try {
      await onArchive(reward.id);
      toast.success('Reward archived successfully');
    } catch (error) {
      toast.error('Failed to archive reward');
    } finally {
      setIsArchiving(false);
    }
  };

  const pointsRequired = reward.points_required;

  const rewardText = reward.type === 'voucher'
    ? `${reward.name}`
    : reward.type === 'free'
      ? `${reward.name}`
      : reward.type === 'discount'
        ? `${reward.name}`
        : reward.name;

  return (
    <>
      <Card className="p-6 bg-gradient-to-br from-primary/5 to-secondary/5 hover:shadow-xl transition-all duration-300 border border-primary/10 flex flex-col">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-start gap-2">
            <Gift className="w-5 h-5 text-primary mt-1" />
            <div>
              <h3 className="text-xl font-bold text-gray-900">{rewardText}</h3>
              <p className="text-sm text-gray-600 mt-1">
                {reward.type === 'voucher' ? reward.description : service?.description}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleArchive}
              disabled={isArchiving}
              className="h-8 w-8 p-0"
            >
              <Archive className="w-4 h-4 text-gray-500 hover:text-primary" />
            </Button>
            <div className="flex items-center gap-1.5 bg-primary/10 px-3 py-1.5 rounded-full">
              <Star className="w-4 h-4 text-primary" />
              <span className="font-medium text-primary">{pointsRequired}</span>
            </div>
          </div>
        </div>
        <div className="mt-auto flex flex-col gap-2">
          <Button 
            variant="default" 
            size="lg" 
            className="w-full gap-2 bg-primary hover:bg-primary/90"
            onClick={() => setShowAwardModal(true)}
          >
            <Gift className="w-4 h-4" /> Award to Patient
          </Button>
          <Button 
            variant="outline" 
            size="lg" 
            className="w-full gap-2 hover:bg-primary hover:text-white transition-colors"
            onClick={() => setShowDetails(true)}
          >
            <ArrowRight className="w-4 h-4" /> View Details
          </Button>
        </div>
      </Card>

      <ViewDetailsModal
        isOpen={showDetails}
        onClose={() => setShowDetails(false)}
        reward={reward}
        service={service}
      />

      <AwardRewardModal
        isOpen={showAwardModal}
        onClose={() => setShowAwardModal(false)}
        reward={reward}
        service={service}
      />
    </>
  );
};

const ArchivedRewardsModal = ({ 
  isOpen, 
  onClose 
}: { 
  isOpen: boolean; 
  onClose: () => void;
}) => {
  const [archivedRewards, setArchivedRewards] = useState<RewardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [unarchiving, setUnarchiving] = useState<string | null>(null);
  const practiceId = useCurrentPractice();

  useEffect(() => {
    if (isOpen) {
      fetchArchivedRewards();
    }
  }, [isOpen]);

  const fetchArchivedRewards = async () => {
    try {
      const { data, error } = await supabase
        .from('rewards')
        .select('*')
        .eq('practice_id', practiceId)
        .not('deleted_at', 'is', null);

      if (error) throw error;
      setArchivedRewards(data || []);
    } catch (error) {
      console.error('Error fetching archived rewards:', error);
      toast.error('Failed to fetch archived rewards');
    } finally {
      setLoading(false);
    }
  };

  const handleUnarchive = async (rewardId: string) => {
    setUnarchiving(rewardId);
    try {
      const { error } = await supabase
        .from('rewards')
        .update({ 
          deleted_at: null,
          updated_at: new Date().toISOString() 
        })
        .eq('id', rewardId);

      if (error) throw error;
      
      setArchivedRewards(archivedRewards.filter(r => r.id !== rewardId));
      toast.success('Reward restored successfully');
    } catch (error) {
      console.error('Error unarchiving reward:', error);
      toast.error('Failed to restore reward');
    } finally {
      setUnarchiving(null);
    }
  };

  return (
    <Modal open={isOpen} onOpenChange={onClose}>
      <ModalContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <ModalHeader>
          <ModalTitle className="flex items-center gap-2 text-2xl">
            <Archive className="w-6 h-6" /> Archived Rewards
          </ModalTitle>
          <ModalDescription>
            View and restore your archived rewards
          </ModalDescription>
        </ModalHeader>
        
        {loading ? (
          <div className="py-12 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-500">Loading archived rewards...</p>
          </div>
        ) : archivedRewards.length === 0 ? (
          <div className="py-12 text-center text-gray-500 flex flex-col items-center gap-4">
            <Archive className="w-12 h-12 text-gray-400" />
            <p>No archived rewards found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 px-6">
            {archivedRewards.map((reward) => (
              <Card 
                key={reward.id} 
                className="p-6 bg-gray-50/50 hover:bg-white transition-colors duration-200"
              >
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        {reward.type === 'discount' ? (
                          <Coins className="w-5 h-5 text-primary" />
                        ) : reward.type === 'free' ? (
                          <Gift className="w-5 h-5 text-primary" />
                        ) : (
                          <Star className="w-5 h-5 text-primary" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-medium text-lg">{reward.name}</h3>
                        <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                          <Star className="w-4 h-4" />
                          <span>{reward.points_required} points</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">
                      Archived {new Date(reward.deleted_at!).toLocaleDateString()}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-2 gap-2 hover:bg-primary hover:text-white transition-colors"
                    onClick={() => handleUnarchive(reward.id)}
                    disabled={unarchiving === reward.id}
                  >
                    {unarchiving === reward.id ? (
                      <>
                        <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
                        Restoring...
                      </>
                    ) : (
                      <>
                        <ArrowRight className="w-4 h-4" /> Restore Reward
                      </>
                    )}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
        
        <ModalFooter className="flex justify-end gap-2">
          <Button 
            variant="outline" 
            onClick={onClose}
          >
            Close
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

const ClaimsEmptyState = () => (
  <div className="flex flex-col items-center justify-center py-16 px-4">
    {/* Decorative elements */}
    <div className="relative mb-8">
      <div className="absolute -left-6 top-0 w-12 h-12 bg-secondary/10 rounded-full flex items-center justify-center animate-float delay-150">
        <Users className="w-6 h-6 text-secondary" />
      </div>
      <div className="absolute -right-8 top-4 w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center animate-float">
        <Calendar className="w-5 h-5 text-primary" />
      </div>
      <div className="relative bg-gradient-to-br from-secondary/5 to-primary/5 rounded-full p-8 border border-secondary/10">
        <div className="animate-pulse-slow">
          <div className="absolute inset-0 rounded-full bg-secondary/5 animate-ping-slow"></div>
          <History className="w-16 h-16 text-secondary/40" />
        </div>
      </div>
      <div className="absolute -bottom-4 left-0 w-9 h-9 bg-accent/10 rounded-full flex items-center justify-center animate-float delay-300">
        <Award className="w-5 h-5 text-accent" />
      </div>
    </div>

    {/* Content */}
    <h3 className="text-2xl font-bold bg-gradient-to-r from-secondary to-primary bg-clip-text text-transparent mb-3">
      No Claims History Yet
    </h3>
    <p className="text-gray-500 text-center mb-8 max-w-md">
      When patients redeem their rewards, their claims will appear here. Start by creating rewards that your patients will love.
    </p>

    {/* Actions */}
 
    {/* Quick stats */}
    <div className="mt-12 grid grid-cols-2 sm:grid-cols-3 gap-6 text-center max-w-2xl w-full">
      <div className="p-4 rounded-lg bg-secondary/5">
        <Award className="w-5 h-5 text-secondary mx-auto mb-2" />
        <p className="text-sm text-gray-500">Available Rewards</p>
        <p className="text-xl font-semibold text-gray-900">{ Rewards.length}</p>
      </div>
      <div className="p-4 rounded-lg bg-primary/5">
        <Users className="w-5 h-5 text-primary mx-auto mb-2" />
        <p className="text-sm text-gray-500">Active Patients</p>
        <p className="text-xl font-semibold text-gray-900">0</p>
      </div>
      <div className="hidden sm:block p-4 rounded-lg bg-accent/5">
        <Star className="w-5 h-5 text-accent mx-auto mb-2" />
        <p className="text-sm text-gray-500">Points Issued</p>
        <p className="text-xl font-semibold text-gray-900">0</p>
      </div>
    </div>
  </div>
);

const generateUniqueCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Update the prop type in AddRewardTierModal to accept a Promise
interface AddRewardTierModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (rewards: RewardItem[]) => Promise<void>;
  services: Service[];
  products: Product[];
}

const AwardRewardModal = ({ 
  isOpen, 
  onClose, 
  reward,
  service 
}: { 
  isOpen: boolean; 
  onClose: () => void;
  reward: RewardItem;
  service?: Service;
}) => {
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [awarding, setAwarding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const practiceId = useCurrentPractice();

  useEffect(() => {
    if (isOpen) {
      fetchPatients();
    } else {
      // Reset state when modal closes
      setSelectedPatient(null);
      setSearchQuery('');
    }
  }, [isOpen]);

  const fetchPatients = async () => {
    try {
      // Fetch all patients, not just eligible ones
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('practice_id', practiceId);

      if (error) throw error;
      setPatients(data || []);
    } catch (error) {
      console.error('Error fetching patients:', error);
      toast.error('Failed to fetch patients');
    } finally {
      setLoading(false);
    }
  };

  const isPatientEligible = (patient: Patient) => {
    return patient.points >= reward.points_required;
  };

  const filteredPatients = patients.filter(patient =>
    (patient.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
     patient.email?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleAwardReward = async (reward: RewardItem, service?: Service) => {
    if (!selectedPatient) return;

    if (!isPatientEligible(selectedPatient)) {
      toast.error('Patient does not have enough points for this reward');
      return;
    }
    
    setAwarding(true);
    try {
      // Get the latest patient data to ensure points haven't changed
      const { data: latestPatient, error: fetchError } = await supabase
        .from('patients')
        .select('*')
        .eq('id', selectedPatient.id)
        .single();

      if (fetchError) throw fetchError;

      // Verify points again with latest data
      if (!latestPatient || latestPatient.points < reward.points_required) {
        throw new Error('Insufficient points');
      }

      const newPoints = latestPatient.points - reward.points_required;
      const redemptionCode = generateUniqueCode();

      // First create the reward claim with service information
      const { error: claimError } = await supabase
        .from('reward_claims')
        .insert([{
          patient_id: selectedPatient.id,
          patient_email: selectedPatient.email,
          reward_id: reward.id,
          points_used: reward.points_required,
          practice_id: practiceId,
          created_at: new Date().toISOString(),
          redemption_code: redemptionCode,
          status: 'claimed',
          service_id: reward.service_id,
          service_name: service?.name || reward.name,
          is_redeemed: false
        }]);

      if (claimError) throw claimError;

      // If claim creation succeeds, update patient points
      const newRewardClaim = {
        reward_id: reward.id,
        reward_name: reward.name,
        points_used: reward.points_required,
        claimed_at: new Date().toISOString(),
        service_id: reward.service_id,
        service_name: service?.name || reward.name,
        redemption_code: redemptionCode,
        status: 'claimed'
      };

      const { error: updateError } = await supabase
        .from('patients')
        .update({ 
          points: newPoints,
          reward_claims: [...(latestPatient.reward_claims || []), newRewardClaim],
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedPatient.id);

      if (updateError) throw updateError;

      toast.success(
        <div className="space-y-2">
          <p>Reward successfully awarded to {selectedPatient.name}</p>
          <p className="font-mono text-lg">Redemption Code: {redemptionCode}</p>
        </div>
      );
      onClose();
    } catch (error: any) {
      console.error('Error awarding reward:', error);
      if (error.message === 'Insufficient points') {
        toast.error('Patient no longer has enough points for this reward');
      } else {
        toast.error('Failed to award reward');
      }
    } finally {
      setAwarding(false);
    }
  };

  return (
    <Modal open={isOpen} onOpenChange={onClose}>
      <ModalContent>
        <ModalHeader>
          <ModalTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5" /> Award Reward
          </ModalTitle>
          <ModalDescription>
            Select a patient to award "{reward.name}" ({reward.points_required} points required)
          </ModalDescription>
        </ModalHeader>

        <div className="p-6 space-y-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              className="pl-10"
              placeholder="Search patients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : filteredPatients.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No patients found
            </div>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {filteredPatients.map((patient) => {
                const eligible = isPatientEligible(patient);
                return (
                  <div
                    key={patient.id}
                    className={`p-4 rounded-lg transition-colors border ${
                      selectedPatient?.id === patient.id
                        ? 'bg-primary/10 border-primary'
                        : eligible
                        ? 'hover:bg-gray-50 border-transparent cursor-pointer'
                        : 'bg-gray-50 border-transparent opacity-60'
                    }`}
                    onClick={() => eligible && setSelectedPatient(patient)}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-medium">{patient.name}</h4>
                        <p className="text-sm text-gray-500">{patient.email}</p>
                      </div>
                      <div className={`flex items-center gap-2 ${
                        eligible ? 'text-primary' : 'text-gray-400'
                      }`}>
                        <Star className="w-4 h-4" />
                        <span>{patient.points} points</span>
                        {!eligible && (
                          <span className="text-xs text-red-500 ml-2">
                            Insufficient points
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <ModalFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => handleAwardReward(reward, service)}
            disabled={!selectedPatient || awarding || !selectedPatient || !isPatientEligible(selectedPatient)}
            className="gap-2"
          >
            {awarding ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
                Awarding...
              </>
            ) : (
              <>
                <Gift className="w-4 h-4" /> Award Reward
              </>
            )}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

// Add a function to fetch reward claims
const fetchRewardClaims = async (practiceId: string) => {
  const { data, error } = await supabase
    .from('reward_claims')
    .select(`
      *,
      rewards (*),
      patients (name)
    `)
    .eq('practice_id', practiceId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
};

// Update the RecentClaims component
const RecentClaims = () => {
  const practiceId = useCurrentPractice();
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadClaims = async () => {
      try {
        setLoading(true);
        const claimsData = await fetchRewardClaims(practiceId);
        setClaims(claimsData);
      } catch (error) {
        console.error('Error fetching claims:', error);
        toast.error('Failed to fetch reward claims');
      } finally {
        setLoading(false);
      }
    };

    if (practiceId) {
      loadClaims();
    }
  }, [practiceId]);

  if (loading) {
    return <div>Loading claims...</div>;
  }

  if (claims.length === 0) {
    return <ClaimsEmptyState />;
  }

  return (
    <div className="space-y-4">
      {claims.map((claim) => (
        <RewardClaim
          key={claim.id}
          patient={claim.patients?.name || 'Unknown Patient'}
          reward={claim.rewards?.name || 'Unknown Reward'}
          points={claim.rewards?.points_required || 0}
          date={format(new Date(claim.created_at), 'MMM d, yyyy')}
          status={claim.status}
          is_redeemed={claim.is_redeemed}
        />
      ))}
    </div>
  );
};

const Rewards = () => {
  const practiceId = useCurrentPractice();
  const [services, setServices] = useState<Service[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isAddTierModalOpen, setIsAddTierModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [rewards, setRewards] = useState<RewardItem[]>([]);
  const [isArchivedModalOpen, setIsArchivedModalOpen] = useState(false);

  useEffect(() => {
    if (practiceId) {
      fetchServices();
      fetchProducts();
      fetchRewards();
    }
  }, [practiceId]);

  const fetchServices = async () => {
    try {
      const { data, error } = await supabase
        .from('practices')
        .select('services')
        .eq('id', practiceId)
        .single();

      if (error) throw error;
      
      // Transform the services array from the services column
      const servicesWithIds = (data?.services || []).map((service: Service, index: number) => ({
        ...service,
        id: service.id || `service-${index}`
      }));

      setServices(servicesWithIds);
    } catch (error) {
      console.error('Error fetching services:', error);
      toast.error('Failed to fetch services');
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('practice_id', practiceId);

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to fetch products');
    }
  };

  const fetchRewards = async () => {
    try {
      const { data, error } = await supabase
        .from('rewards')
        .select('*')
        .eq('practice_id', practiceId)
        .is('deleted_at', null);

      if (error) throw error;
      setRewards(data || []);
    } catch (error) {
      console.error('Error fetching rewards:', error);
      toast.error('Failed to fetch rewards');
    }
  };

  const handleAddRewardTier = async (rewards: RewardItem[]) => {
    try {
      const { data, error } = await supabase
        .from('rewards')
        .insert(rewards.map(reward => ({
          name: reward.name,
          type: reward.type,
          service_id: reward.service_id || null,
          points_required: reward.points_required,
          discount_percentage: reward.discount_percentage,
          practice_id: practiceId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })))
        .select();

      if (error) throw error;

      toast.success('Rewards added successfully');
      fetchRewards();
    } catch (error) {
      console.error('Error adding rewards:', error);
      toast.error('Failed to add rewards');
    }
  };

  const handleArchiveReward = async (rewardId: string) => {
    try {
      const { error } = await supabase
        .from('rewards')
        .update({ 
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString() 
        })
        .eq('id', rewardId);

      if (error) throw error;
      
      // Update local state to remove archived reward
      setRewards(rewards.filter(r => r.id !== rewardId));
    } catch (error) {
      console.error('Error archiving reward:', error);
      throw error;
    }
  };

  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      {/* Decorative elements */}
      <div className="relative mb-8">
        <div className="absolute -left-8 top-0 w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center animate-bounce-slow">
          <Star className="w-6 h-6 text-primary" />
        </div>
        <div className="absolute -right-6 top-4 w-10 h-10 bg-secondary/10 rounded-full flex items-center justify-center animate-bounce-slow delay-100">
          <Trophy className="w-5 h-5 text-secondary" />
        </div>
        <div className="bg-gradient-to-br from-primary/5 to-secondary/5 rounded-full p-8 border border-primary/10">
          <div className="relative">
            <Sparkles className="w-16 h-16 text-primary/40" />
            <Gift className="w-10 h-10 text-primary absolute inset-0 m-auto" />
          </div>
        </div>
        <div className="absolute -bottom-4 right-0 w-8 h-8 bg-accent/10 rounded-full flex items-center justify-center animate-bounce-slow delay-200">
          <Star className="w-4 h-4 text-accent" fill="currentColor" />
        </div>
      </div>

      {/* Content */}
      <h3 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-3">
        Start Rewarding Your Patients
      </h3>
      <p className="text-gray-500 text-center mb-8 max-w-md">
        Create reward tiers to incentivize patient loyalty. Set up points, discounts, and special offers to keep your patients coming back.
      </p>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Button 
          onClick={() => setIsAddTierModalOpen(true)}
          className="gap-2 bg-primary hover:bg-primary/90"
        >
          <Gift className="w-4 h-4" />
          Create First Reward
        </Button>
        <Button 
          variant="outline" 
          onClick={() => {
            // Add reward templates functionality here
            toast.info('Reward templates coming soon!');
          }}
          className="gap-2"
        >
          <Sparkles className="w-4 h-4" />
          Browse Templates
        </Button>
      </div>

      {/* Help text */}
      <p className="text-sm text-gray-400 mt-8 flex items-center gap-2">
        <Star className="w-4 h-4" fill="currentColor" />
        Patients earn points with every visit
      </p>
    </div>
  );

  // Add this CSS to your global styles or use inline styles
  const styles = `
    @keyframes bounce-slow {
      0%, 100% {
        transform: translateY(0);
      }
      50% {
        transform: translateY(-10px);
      }
    }
    .animate-bounce-slow {
      animation: bounce-slow 3s infinite;
    }
    .delay-100 {
      animation-delay: 0.1s;
    }
    .delay-200 {
      animation-delay: 0.2s;
    }
    @keyframes float {
      0%, 100% {
        transform: translateY(0);
      }
      50% {
        transform: translateY(-8px);
      }
    }

    @keyframes ping-slow {
      0% {
        transform: scale(1);
        opacity: 0.5;
      }
      50% {
        transform: scale(1.2);
        opacity: 0;
      }
      100% {
        transform: scale(1);
        opacity: 0.5;
      }
    }

    .animate-float {
      animation: float 3s ease-in-out infinite;
    }

    .animate-ping-slow {
      animation: ping-slow 3s cubic-bezier(0, 0, 0.2, 1) infinite;
    }

    .delay-150 {
      animation-delay: 0.15s;
    }

    .delay-300 {
      animation-delay: 0.3s;
    }
  `;

  return (
    <DashboardLayout>
      <style>{styles}</style>
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Rewards Management
            </h1>
            <p className="text-gray-600 mt-2">
              Manage available rewards for your patients
            </p>
          </div>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              size="lg" 
              className="gap-2 hover:bg-gray-50 min-w-[180px]"
              onClick={() => setIsArchivedModalOpen(true)}
            >
              <Archive className="w-4 h-4" /> Archived Rewards
            </Button>
            <Button 
              size="lg"
              className="gap-2 bg-primary hover:bg-primary/90 min-w-[180px]"
              onClick={() => setIsAddTierModalOpen(true)}
            >
              <Plus className="w-4 h-4" /> Add New Reward
            </Button>
          </div>
        </div>

        {/* Update the metrics section */}
        {rewards.length > 0 ? (
          <RewardsMetrics />
        ) : null}

        <Tabs defaultValue="active" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="active">Active Rewards</TabsTrigger>
            <TabsTrigger value="claims">Recent Claims</TabsTrigger>
          </TabsList>

          <TabsContent value="active">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="flex flex-col items-center gap-2">
                  <div className="animate-spin">
                    <Gift className="w-8 h-8 text-primary/60" />
                  </div>
                  <p className="text-sm text-gray-500">Loading rewards...</p>
                </div>
              </div>
            ) : rewards.length === 0 ? (
              <Card className="border-dashed">
                <EmptyState />
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {rewards.map((reward) => (
                  <RewardCard
                    key={reward.id}
                    reward={reward}
                    service={services.find(s => s.id === reward.service_id)}
                    onArchive={handleArchiveReward}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="claims">
            <RecentClaims />
          </TabsContent>
        </Tabs>

        <AddRewardTierModal
          isOpen={isAddTierModalOpen}
          onClose={() => setIsAddTierModalOpen(false)}
          onAdd={handleAddRewardTier}
          services={services}
          products={products}
        />

        <ArchivedRewardsModal
          isOpen={isArchivedModalOpen}
          onClose={() => setIsArchivedModalOpen(false)}
        />
      </div>
    </DashboardLayout>
  );
};

export default Rewards;