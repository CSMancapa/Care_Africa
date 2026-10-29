import { Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useEffect } from "react";
import { Check, Package, ChevronLeft, Coins, Tag } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { toast } from "react-hot-toast";
import { supabase } from "@/config/supabase";
import type { RewardItem } from '@/types/rewards';

interface Service {
  id: string;
  name: string;
  price: number;
  description: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
}

interface AddRewardTierModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (rewards: RewardItem[]) => Promise<void>;
  services: Service[];
  products: Product[];
}

const generateRewardsForService = (service: Service): RewardItem[] => {
  return [
    {
      name: `15% off ${service.name}`,
      type: 'discount',
      service_id: service.id,
      points_required: Math.round(service.price * 1.5),
      discount_percentage: 15
    },
    {
      name: `25% off ${service.name}`,
      type: 'discount',
      service_id: service.id,
      points_required: Math.round(service.price * 2.5),
      discount_percentage: 25
    },
    {
      name: `50% off ${service.name}`,
      type: 'discount',
      service_id: service.id,
      points_required: Math.round(service.price * 5),
      discount_percentage: 50
    },
    {
      name: `Free ${service.name}`,
      type: 'free',
      service_id: service.id,
      points_required: service.price * 10
    }
  ];
};

const generateRewardsForProduct = (product: Product): RewardItem[] => {
  return [
    {
      name: `15% off ${product.name}`,
      type: 'discount',
      service_id: product.id,
      points_required: Math.round(product.price * 1.5),
      discount_percentage: 15
    },
    {
      name: `25% off ${product.name}`,
      type: 'discount',
      service_id: product.id,
      points_required: Math.round(product.price * 2.5),
      discount_percentage: 25
    },
    {
      name: `50% off ${product.name}`,
      type: 'discount',
      service_id: product.id,
      points_required: Math.round(product.price * 5),
      discount_percentage: 50
    },
    {
      name: `Free ${product.name}`,
      type: 'free',
      service_id: product.id,
      points_required: product.price * 10
    }
  ];
};

const handleAddRewardTier = async (rewards: RewardItem[], practiceId: string, fetchRewards: () => void) => {
  try {
    const { data, error } = await supabase
      .from('rewards')
      .insert(rewards.map(reward => ({
        name: reward.type === 'free' ? `Free ${reward.name}` : reward.name,
        type: reward.type,
        service_id: reward.service_id,
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

export function AddRewardTierModal({ isOpen, onClose, onAdd, services, products = [] }: AddRewardTierModalProps) {
  const [selectedType, setSelectedType] = useState<'products' | 'services' | null>(null);
  const [activeTab, setActiveTab] = useState<string>("");
  const [selectedRewards, setSelectedRewards] = useState<RewardItem[]>([]);

  // Set initial active tab when services are loaded
  useEffect(() => {
    if (services.length > 0 && !activeTab) {
      setActiveTab(`service-0`);
    }
  }, [services]);

  const isRewardSelected = (reward: RewardItem) => {
    return selectedRewards.some(
      (r) =>
        r.service_id === reward.service_id &&
        r.type === reward.type &&
        r.discount_percentage === reward.discount_percentage
    );
  };

  const toggleReward = (reward: RewardItem) => {
    if (isRewardSelected(reward)) {
      setSelectedRewards(selectedRewards.filter(
        (r) =>
          !(r.service_id === reward.service_id &&
            r.type === reward.type &&
            r.discount_percentage === reward.discount_percentage)
      ));
    } else {
      setSelectedRewards([...selectedRewards, reward]);
    }
  };

  const renderRewardsList = (items: Service[] | Product[], type: 'services' | 'products') => (
    <div className="flex-1 overflow-y-auto min-h-0 pb-4">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4 sticky top-0 bg-white z-10">
          {items.map((item, index) => (
            <TabsTrigger 
              key={`trigger-${index}`} 
              value={`${type}-${index}`}
            >
              {item.name} - R{item.price}
            </TabsTrigger>
          ))}
        </TabsList>

        {items.map((item, index) => (
          <TabsContent 
            key={`content-${index}`} 
            value={`${type}-${index}`}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-6">
              {(type === 'services' ? generateRewardsForService(item as Service) : generateRewardsForProduct(item as Product))
                .map((reward, rewardIndex) => (
                <div
                  key={`${item.id}-${reward.type}-${reward.type === 'discount' ? reward.discount_percentage : 'free'}-${rewardIndex}`}
                  className={`p-6 rounded-lg border shadow-sm cursor-pointer transition-all ${
                    isRewardSelected(reward)
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'border-gray-200 hover:border-primary/50 hover:shadow-md'
                  }`}
                  onClick={() => toggleReward(reward)}
                >
                  <div className="space-y-6">
                    <div className="flex justify-between items-start">
                      <h3 className="font-semibold text-lg text-gray-900">{reward.name}</h3>
                      {isRewardSelected(reward) && (
                        <Check className="w-5 h-5 text-primary shrink-0" />
                      )}
                    </div>

                    <div className="flex items-center space-x-3 bg-gray-50 p-4 rounded-md">
                      <div className="bg-primary/10 rounded-full p-2">
                        <Coins className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">Points Required</p>
                        <p className="text-lg font-bold text-primary">{reward.points_required}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 bg-green-50 p-4 rounded-md">
                      <div className="bg-green-100 rounded-full p-2">
                        <Tag className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">Value</p>
                        <p className="text-lg font-bold text-green-600">
                          R{reward.type === 'free' 
                            ? item.price 
                            : Math.round((item.price * (reward.discount_percentage || 0)) / 100)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );

  return (
    <Modal open={isOpen} onOpenChange={onClose}>
      <ModalContent className="max-w-[90vw] max-h-[80vh] flex flex-col overflow-hidden">
        <ModalHeader className="flex-none">
          <ModalTitle>Add New Rewards</ModalTitle>
          <ModalDescription>
            Choose the type of reward you want to create
          </ModalDescription>
        </ModalHeader>

        {!selectedType ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
            <div
              onClick={() => setSelectedType('products')}
              className="group cursor-pointer relative overflow-hidden rounded-xl border-2 border-gray-200 hover:border-primary transition-all"
            >
              <div className="p-6 space-y-4">
                <div className="bg-primary/10 w-12 h-12 rounded-lg flex items-center justify-center">
                  <Package className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">Product Rewards</h3>
                  <p className="text-gray-500 mt-2">Create rewards for physical products from your inventory</p>
                </div>
                <div className="mt-4">
                  <span className="text-sm text-primary font-medium">
                    {products.length} products available
                  </span>
                </div>
              </div>
              <div className="absolute inset-0 border-2 border-primary opacity-0 group-hover:opacity-100 transition-opacity rounded-xl" />
            </div>

            <div
              onClick={() => setSelectedType('services')}
              className="group cursor-pointer relative overflow-hidden rounded-xl border-2 border-gray-200 hover:border-primary transition-all"
            >
              <div className="p-6 space-y-4">
                <div className="bg-primary/10 w-12 h-12 rounded-lg flex items-center justify-center">
                  <svg 
                    className="w-6 h-6 text-primary"
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">Service Rewards</h3>
                  <p className="text-gray-500 mt-2">Create rewards for services and treatments</p>
                </div>
                <div className="mt-4">
                  <span className="text-sm text-primary font-medium">
                    {services.length} services available
                  </span>
                </div>
              </div>
              <div className="absolute inset-0 border-2 border-primary opacity-0 group-hover:opacity-100 transition-opacity rounded-xl" />
            </div>
          </div>
        ) : (
          <>
            <div className="px-6 pb-6">
              <Button 
                variant="ghost" 
                className="gap-2"
                onClick={() => {
                  setSelectedType(null);
                  setActiveTab("");
                  setSelectedRewards([]);
                }}
              >
                <ChevronLeft className="w-4 h-4" /> Back to selection
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0">
              {selectedType === 'products' ? (
                products.length === 0 ? (
                  <div className="text-center p-8 text-gray-500">
                    No products found. Please add products first.
                  </div>
                ) : (
                  renderRewardsList(products, 'products')
                )
              ) : (
                services.length === 0 ? (
                  <div className="text-center p-8 text-gray-500">
                    No services found. Please add services first.
                  </div>
                ) : (
                  renderRewardsList(services, 'services')
                )
              )}
            </div>
          </>
        )}

        <div className="flex-none flex justify-end gap-3 p-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={() => {
              onAdd(selectedRewards);
              onClose();
            }}
            disabled={selectedRewards.length === 0}
          >
            Add Selected Rewards ({selectedRewards.length})
          </Button>
        </div>
      </ModalContent>
    </Modal>
  );
}