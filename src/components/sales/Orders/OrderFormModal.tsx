import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Modal,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalTitle,
} from "@/components/ui/modal";
import { Package, Check, Search, User, Minus, Plus } from "lucide-react";
import { Card } from '@/components/ui/card';
import { useCurrentPractice } from '@/hooks/useCurrentPractice';
import { toast } from 'sonner';
import { Patient } from '@/types/patient';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Gift, ChevronRight } from "lucide-react";
import { PatientSearchSelect } from './PatientSearchSelect';
import { listProducts } from "@/lib/db/products";
import { listPatients } from "@/lib/db/patients";
import { lookupRewardCode } from "@/lib/db/appointments";
import { createOrder } from "@/lib/db/sales";

interface Product {
  id: string;
  name: string;
  price: number;
  current_stock: number;
  images?: string[];
}

interface OrderItem {
  productId: string;
  quantity: number;
  size?: string;
  price: number;
  productName: string;
}

interface PaymentMethod {
  id: string;
  type: 'credit_card' | 'cash' | 'eft';
  last4?: string;
}

interface OrderFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called after the sale is saved, e.g. to refresh the orders list. */
  onSubmit?: () => void;
}

const OrderFormModal: React.FC<OrderFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItems, setSelectedItems] = useState<OrderItem[]>([]);
  const practiceId = useCurrentPractice();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientSearchQuery, setPatientSearchQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showPatientSearch, setShowPatientSearch] = useState(false);
  const [step, setStep] = useState<'items' | 'payment'>('items');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [rewardCode, setRewardCode] = useState('');
  const [isApplyingCode, setIsApplyingCode] = useState(false);
  const [appliedReward, setAppliedReward] = useState<{
    id: string;
    type: 'service' | 'voucher';
    discount_percentage?: number;
    service_id?: string;
  } | null>(null);
  const [discountAmount, setDiscountAmount] = useState(0);

  // Start every checkout fresh, with current stock and members.
  useEffect(() => {
    if (!isOpen) return;
    setSelectedItems([]);
    setSelectedPatient(null);
    setPatientSearchQuery('');
    setSearchQuery('');
    setStep('items');
    setPaymentMethod(null);
    setRewardCode('');
    setAppliedReward(null);
    setDiscountAmount(0);
    if (practiceId) {
      fetchProducts();
      fetchPatients();
    }
  }, [isOpen, practiceId]);

  const fetchProducts = async () => {
    if (!practiceId) return;
    setLoading(true);
    try {
      if (!practiceId) return;
      setProducts((await listProducts(practiceId)) as any);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to fetch products');
    } finally {
      setLoading(false);
    }
  };

  const fetchPatients = async () => {
    if (!practiceId) return;
    try {
      if (!practiceId) return;
      setPatients(await listPatients(practiceId));
    } catch (error) {
      console.error('Error fetching patients:', error);
      toast.error('Failed to fetch patients');
    }
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPatients = patients.filter(patient =>
    patient.name?.toLowerCase().includes(patientSearchQuery.toLowerCase()) ||
    patient.email?.toLowerCase().includes(patientSearchQuery.toLowerCase())
  );

  const handlePatientSelect = (patientId: string) => {
    const patient = patients.find(p => p.id === patientId);
    console.log('Selected Patient:', patient);
    setSelectedPatient(patient || null);
  };

  const handleQuantityChange = (productId: string, quantity: number) => {
    console.log('Quantity Change:', { productId, quantity });
    setSelectedItems(prev => {
      const product = products.find(p => p.id === productId);
      const existing = prev.find(item => item.productId === productId);
      
      if (!existing) {
        const newItem = {
          productId,
          quantity,
          price: product?.price || 0,
          productName: product?.name || ''
        };
        console.log('Adding New Item:', newItem);
        return [...prev, newItem];
      }
      
      const updatedItems = prev.map(item => 
        item.productId === productId ? { 
          ...item,
          quantity,
          productName: product?.name || ''
        } : item
      );
      console.log('Updated Items:', updatedItems);
      return updatedItems;
    });
  };

  const getTotal = () => {
    const subtotal = selectedItems.reduce((sum, item) => {
      const product = products.find(p => p.id === item.productId);
      return sum + (product?.price || 0) * item.quantity;
    }, 0);
    return subtotal - discountAmount;
  };

  const handlePaymentMethodSelect = (method: PaymentMethod['type']) => {
    console.log('Selected Payment Method:', method);
    setPaymentMethod({ id: method, type: method });
  };

  // Check a reward code against the basket. It's used up only when the sale
  // is saved, and the database works out the final discount.
  const validateRewardCode = async (code: string) => {
    setIsApplyingCode(true);
    try {
      if (!practiceId) return;
      const claim = await lookupRewardCode(practiceId, code);
      if (claim.service_id) {
        toast.error('This reward is for a service. Use it when booking the visit.');
        return;
      }
      if (selectedPatient?.id && claim.patient_id !== selectedPatient.id) {
        toast.error('This reward code belongs to a different member');
        return;
      }
      const line = claim.product_id ? selectedItems.find(i => i.productId === claim.product_id) : undefined;
      if (claim.product_id && !line) {
        const name = products.find(p => p.id === claim.product_id)?.name ?? 'the rewarded product';
        toast.error(`Add ${name} to the basket to use this reward`);
        return;
      }

      const subtotal = selectedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
      let discount = 0;
      if (claim.reward_type === 'free' && line) {
        discount = line.price;
      } else if (claim.reward_type === 'discount') {
        const base = line ? line.price * line.quantity : subtotal;
        discount = Math.round(base * (claim.discount_percentage ?? 0)) / 100;
      }
      setDiscountAmount(discount);
      setAppliedReward({ id: claim.reward_id, name: claim.reward_name } as any);
      setRewardCode(code.trim().toUpperCase());
      toast.success(`${claim.reward_name} applied: R${discount.toFixed(2)} off`);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to validate reward code');
    } finally {
      setIsApplyingCode(false);
    }
  };

  const handleSubmit = async () => {
    try {
      if (!practiceId) return;
      if (selectedItems.length === 0) {
        toast.error('Add at least one product');
        return;
      }
      const result = await createOrder(practiceId, {
        patientId: selectedPatient?.id ?? null,
        items: selectedItems.map(item => ({ productId: item.productId, quantity: item.quantity })),
        paymentMethod: paymentMethod?.type,
        rewardCode: appliedReward ? rewardCode : undefined,
      });

      const who = selectedPatient?.name ?? 'walk-in customer';
      toast.success(
        result.pointsAwarded > 0
          ? `Order ${result.orderNumber} saved for ${who}: R${result.total.toFixed(2)}, ${result.pointsAwarded} points earned`
          : `Order ${result.orderNumber} saved: R${result.total.toFixed(2)}`
      );
      onSubmit?.();
      onClose();
    } catch (error: any) {
      console.error('Error creating order:', error);
      toast.error(error?.message || 'Failed to create order');
    }
  };

  return (
    <Modal open={isOpen}>
      <ModalContent className="max-h-[90vh] w-full max-w-6xl overflow-hidden flex flex-col">
        <div className="flex-none">
          <ModalHeader className="space-y-1 p-4 border-b">
            <div className="flex items-center justify-between">
              <ModalTitle className="text-xl font-bold">Checkout</ModalTitle>
              <div className="flex items-center gap-2">
                <Badge variant={step === 'items' ? "default" : "outline"}>
                  1. Items
                </Badge>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
                <Badge variant={step === 'payment' ? "default" : "outline"}>
                  2. Payment
                </Badge>
              </div>
            </div>
          </ModalHeader>
        </div>

        <Tabs value={step} className="flex-1 flex flex-col overflow-hidden">
          <TabsContent value="items" className="flex-1 flex flex-col m-0">
            <div className="flex-none p-3 border-b">
              {selectedPatient ? (
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <User className="w-4 h-4 text-primary" />
                    <div>
                      <p className="font-medium">{selectedPatient.name}</p>
                      <p className="text-sm text-muted-foreground">{selectedPatient.email}</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedPatient(null)}
                  >
                    Change Patient
                  </Button>
                </div>
              ) : (
                <PatientSearchSelect
                  value={selectedPatient?.id}
                  onChange={handlePatientSelect}
                />
              )}
            </div>

            <div className="flex-1 flex min-h-0">
              <div className="flex-1 flex flex-col min-w-0">
                <div className="flex-none p-3 border-b">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                    <Input
                      placeholder="Search products..."
                      className="pl-10"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-3">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    {filteredProducts.map((product) => (
                      <Card
                        key={product.id}
                        className="p-3 hover:shadow-md transition-shadow"
                      >
                        <div className="flex gap-3">
                          <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center flex-none">
                            {product.images?.[0] ? (
                              <img
                                src={product.images[0]}
                                alt={product.name}
                                className="w-full h-full object-cover rounded-lg"
                              />
                            ) : (
                              <Package className="w-6 h-6 text-gray-400" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium truncate">{product.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              R{product.price.toFixed(2)}
                            </p>
                            <div className="mt-2 flex items-center gap-2">
                              <div className="flex items-center">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-7 w-7 p-0"
                                  onClick={() => {
                                    const currentQty = selectedItems.find(item => item.productId === product.id)?.quantity || 0;
                                    handleQuantityChange(product.id, Math.max(0, currentQty - 1));
                                  }}
                                >
                                  <Minus className="w-3 h-3" />
                                </Button>
                                <Input
                                  type="number"
                                  min="0"
                                  max={product.current_stock}
                                  className="w-14 h-7 text-center mx-1 px-1"
                                  value={selectedItems.find(item => item.productId === product.id)?.quantity || 0}
                                  onChange={(e) => handleQuantityChange(product.id, parseInt(e.target.value) || 0)}
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-7 w-7 p-0"
                                  onClick={() => {
                                    const currentQty = selectedItems.find(item => item.productId === product.id)?.quantity || 0;
                                    handleQuantityChange(product.id, Math.min(product.current_stock, currentQty + 1));
                                  }}
                                >
                                  <Plus className="w-3 h-3" />
                                </Button>
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {product.current_stock} in stock
                              </span>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>

              <div className="w-[320px] border-l flex flex-col min-h-0 bg-gray-50/50">
                <div className="flex-none p-3 border-b bg-background">
                  <h3 className="font-medium">Order Summary</h3>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {selectedItems.map((item) => {
                    const product = products.find(p => p.id === item.productId);
                    if (!product || item.quantity === 0) return null;
                    return (
                      <Card key={item.productId} className="p-3">
                        <div className="flex justify-between items-start gap-2">
                          <div className="min-w-0">
                            <p className="font-medium truncate">{product.name}</p>
                            <p className="text-sm text-muted-foreground">
                              R{product.price.toFixed(2)} × {item.quantity}
                            </p>
                          </div>
                          <p className="font-medium flex-none">
                            R{(product.price * item.quantity).toFixed(2)}
                          </p>
                        </div>
                      </Card>
                    );
                  })}
                </div>
                <div className="flex-none p-3 border-t bg-background">
                  <div className="flex justify-between items-center font-medium">
                    <span>Total</span>
                    <span>R{getTotal().toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-none p-4 border-t bg-background">
              <div className="flex justify-between items-center">
                <div className="text-sm text-muted-foreground">
                  {selectedItems.length > 0 && (
                    <span>{selectedItems.reduce((sum, item) => sum + item.quantity, 0)} items selected</span>
                  )}
                </div>
                <div className="flex gap-3">
                  <Button type="button" variant="outline" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button
                    onClick={() => setStep('payment')}
                    disabled={selectedItems.length === 0 || !selectedPatient}
                  >
                    Continue to Payment
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="payment" className="flex-1 flex flex-col m-0">
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-primary" />
                  Payment Method
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  {['credit_card', 'cash', 'eft'].map((method) => (
                    <Card
                      key={method}
                      className={`p-4 cursor-pointer transition-all ${
                        paymentMethod?.type === method 
                          ? 'border-primary ring-1 ring-primary' 
                          : 'hover:border-primary/50'
                      }`}
                      onClick={() => handlePaymentMethodSelect(method as PaymentMethod['type'])}
                    >
                      <div className="flex items-center gap-3">
                        {method === 'credit_card' && <CreditCard className="w-4 h-4" />}
                        <span className="font-medium">{({ credit_card: 'Card', cash: 'Cash', eft: 'EFT' } as Record<string, string>)[method]}</span>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Gift className="w-4 h-4 text-primary" />
                  Reward Code
                </h3>
                <div className="flex gap-3">
                  <Input
                    placeholder="Enter reward code"
                    value={rewardCode}
                    onChange={(e) => setRewardCode(e.target.value)}
                  />
                  <Button
                    variant="outline"
                    disabled={!rewardCode || isApplyingCode}
                    onClick={() => {
                      validateRewardCode(rewardCode);
                    }}
                  >
                    Apply
                  </Button>
                </div>
              </div>

              <Card className="p-4">
                <h3 className="font-semibold mb-4">Order Summary</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span>R{(getTotal() + discountAmount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Discount</span>
                    <span>{discountAmount > 0 ? '−' : ''}R{discountAmount.toFixed(2)}</span>
                  </div>
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between font-medium">
                      <span>Total</span>
                      <span>R{getTotal().toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            <div className="flex-none p-4 border-t bg-background">
              <div className="flex justify-between items-center">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setStep('items')}
                >
                  Back to Items
                </Button>
                <div className="flex gap-3">
                  <Button type="button" variant="outline" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={!paymentMethod || !selectedPatient}
                  >
                    Complete Order
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </ModalContent>
    </Modal>
  );
};

export default OrderFormModal; 