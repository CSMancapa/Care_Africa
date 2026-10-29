import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { format, addDays, isSameDay } from "date-fns";
import { 
  Modal,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalTitle,
} from "@/components/ui/modal";
import { 
  CalendarCheck, 
  Clock, 
  User, 
  Phone, 
  Mail,
  ChevronRight,
  ChevronLeft,
  Info,
  Package,
  Check
} from "lucide-react";
import { Card } from '@/components/ui/card';
import { useCurrentPractice } from '@/hooks/useCurrentPractice';
import { toast } from 'react-hot-toast';
import { Patient } from '@/types/patient';
import { supabase } from '@/config/supabase';
import { useQuery } from '@tanstack/react-query';
import { 
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { AppointmentData } from '@/types/appointment';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DoctorProfile } from '@/types/practice';

const timeSlots = [
  { time: "09:00", available: true },
  { time: "09:30", available: true },
  { time: "10:00", available: false },
  { time: "10:30", available: true },
  { time: "11:00", available: true },
  { time: "11:30", available: false },
  { time: "14:00", available: true },
  { time: "14:30", available: true },
  { time: "15:00", available: true },
  { time: "15:30", available: true },
];

interface Service {
  id: string;
  name: string;
  price: number;
  description: string;
  duration: number;
  practice_id: string;
  created_at?: string;
  updated_at?: string;
}

interface AddAppointmentModalProps {
  patient?: Patient;
  isOpen: boolean;
  onClose: () => void;
  onAdd: (appointmentData: AppointmentData) => void;
}

interface DateButtonProps {
  day: Date;
  selected: Date;
  onSelect: (date: Date) => void;
}

const DateButton: React.FC<DateButtonProps> = ({ day, selected, onSelect }) => (
  <button
    onClick={() => onSelect(day)}
    className={`flex flex-col items-center min-w-[80px] p-3 rounded-xl border transition-all
      ${isSameDay(selected, day) 
        ? 'bg-primary text-primary-foreground border-primary' 
        : 'hover:border-primary/50'}`}
  >
    <span className="text-sm font-medium">{format(day, 'EEE')}</span>
    <span className="text-2xl font-bold my-1">{format(day, 'd')}</span>
    <span className="text-xs">{format(day, 'MMM')}</span>
  </button>
);

// Update the form schema
const formSchema = z.object({
  date: z.date(),
  time: z.string().min(1, "Time is required"),
  patient: z.string().min(1, "Patient name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().min(1, "Phone number is required"),
});

// Add this query to fetch doctors from the practice
const getDoctors = async (practiceId: string) => {
  if (!practiceId) return [];
  
  const { data, error } = await supabase
    .from('practices')
    .select('doctors')
    .eq('id', practiceId)
    .single();

  if (error) {
    console.error('Error fetching doctors:', error);
    throw error;
  }

  return data?.doctors || [];
};

// Add this function to fetch existing appointments
const getExistingAppointments = async (doctorId: string, date: Date) => {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const { data, error } = await supabase
    .from('appointments')
    .select('time')
    .eq('doctor_id', doctorId)
    .gte('time', startOfDay.toISOString())
    .lte('time', endOfDay.toISOString());

  if (error) {
    console.error('Error fetching appointments:', error);
    return [];
  }

  return data?.map(apt => format(new Date(apt.time), 'HH:mm')) || [];
};

const AddAppointmentModal: React.FC<AddAppointmentModalProps> = ({
  patient,
  isOpen,
  onClose,
  onAdd,
}) => {
  const practice = useCurrentPractice();
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [date, setDate] = useState<Date>(new Date());
  const [rewardCodes, setRewardCodes] = useState<Record<string, string>>({});
  const [isApplyingCode, setIsApplyingCode] = useState(false);
  const [appliedReward, setAppliedReward] = useState<{
    id: string;
    type: 'free' | 'discount';
    service_id?: string;
    discount_percentage?: number;
  } | null>(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [selectedDoctor, setSelectedDoctor] = useState<string>('');
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([]);

  // Add form state logging
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: new Date(),
      time: "",
      patient: patient?.name || "",
      email: patient?.email || "",
      phone: patient?.contact_number || "",
    }
  });

  // Add this after form initialization if you need to watch changes
  form.watch((data) => {
    console.log('Form data changed:', data);
  });

  // Update useEffect to set form values when patient changes
  useEffect(() => {
    if (patient) {
      form.setValue('patient', patient.name || '');
      form.setValue('email', patient.email || '');
      form.setValue('phone', patient.contact_number || '');
    }
  }, [patient, form]);

  const next7Days = Array.from({ length: 7 }, (_, i) => addDays(new Date(), i));

  // Function to fetch services
  const getPracticeServices = async (practiceId: string): Promise<Service[]> => {
    if (!practiceId) return [];
    
    const { data, error } = await supabase
      .from('practices')
      .select('services')
      .eq('id', practiceId)
      .single();

    if (error) {
      console.error('Error fetching services:', error);
      throw error;
    }

    // Transform the services to ensure each has an id
    const servicesWithIds = (data?.services || []).map((service: Service) => ({
      ...service,
      id: service.id || `${practiceId}_${service.name}` // Better fallback ID format
    }));

    console.log('Fetched services:', servicesWithIds); // Debug log
    return servicesWithIds;
  };

  // Query for services
  const { data: services = [], isLoading: isLoadingServices } = useQuery({
    queryKey: ['practiceServices', practice],
    queryFn: () => getPracticeServices(practice),
    enabled: !!practice,
  });

  console.log('Services:', services); // Add this for debugging

  // Replace the doctors prop with this query
  const { data: doctors = [] } = useQuery({
    queryKey: ['practiceDoctors', practice],
    queryFn: () => getDoctors(practice),
    enabled: !!practice,
  });

  // Update the generateTimeSlots function
  const generateTimeSlots = useCallback(async (date: Date, doctorId: string) => {
    const doctor = doctors.find(d => d.name === doctorId);
    if (!doctor) return [];

    const dayOfWeek = format(date, 'EEEE').toLowerCase() as keyof typeof doctor.availability;
    const availability = doctor.availability[dayOfWeek];

    if (!availability.isAvailable) {
      return [];
    }

    const startTime = availability.usePracticeHours 
      ? "09:00" 
      : availability.customHours.start;
    const endTime = availability.usePracticeHours
      ? "17:00" 
      : availability.customHours.end;

    // Generate all possible slots
    const slots: string[] = [];
    let currentTime = startTime;
    while (currentTime < endTime) {
      slots.push(currentTime);
      const [hours, minutes] = currentTime.split(':').map(Number);
      const newMinutes = minutes + 30;
      const newHours = hours + Math.floor(newMinutes / 60);
      currentTime = `${String(newHours).padStart(2, '0')}:${String(newMinutes % 60).padStart(2, '0')}`;
    }

    // Get booked appointments
    const bookedSlots = await getExistingAppointments(doctorId, date);

    // Filter out booked slots
    return slots.filter(slot => !bookedSlots.includes(slot));
  }, [doctors]);

  // Update useEffect to handle async generateTimeSlots
  useEffect(() => {
    const updateTimeSlots = async () => {
      if (selectedDoctor && date) {
        const slots = await generateTimeSlots(date, selectedDoctor);
        setAvailableTimeSlots(slots);
        if (!slots.includes(form.getValues('time'))) {
          form.setValue('time', '');
        }
      }
    };

    updateTimeSlots();
  }, [selectedDoctor, date, generateTimeSlots, form]);

  // Update handleSubmit to include reward information
  const handleSubmit = async (formValues: z.infer<typeof formSchema>) => {
    try {
      const selectedServicesData = services
        .filter(service => selectedServices.includes(service.id))
        .map(service => ({
          ...service,
          // Add reward information if a reward was applied to this service
          applied_reward: service.id === appliedReward?.service_id ? {
            type: appliedReward.type,
            discount_percentage: appliedReward.type === 'discount' ? appliedReward.discount_percentage : undefined
          } : undefined
        }));

      const appointmentData = {
        practice_id: practice,
        patient: formValues.patient,
        patient_email: formValues.email,
        patient_phone: formValues.phone,
        time: `${format(formValues.date, 'yyyy-MM-dd')}T${formValues.time}:00`,
        status: 'scheduled' as const,
        services: selectedServicesData,
        // Include the total amount after discounts
        total_amount: selectedServicesData.reduce((sum, service) => {
          if (service.applied_reward) {
            if (service.applied_reward.type === 'free') {
              return sum;
            } else if (service.applied_reward.type === 'discount' && service.applied_reward.discount_percentage) {
              return sum + (service.price * (1 - service.applied_reward.discount_percentage / 100));
            }
          }
          return sum + service.price;
        }, 0),
        doctor_id: selectedDoctor
      };

      onAdd(appointmentData);
    } catch (error) {
      console.error('Error creating appointment:', error);
      toast.error('Failed to create appointment');
    }
  };

  // Update validateRewardCode to log more information
  const validateRewardCode = async (code: string, serviceId: string) => {
    setIsApplyingCode(true);
    try {
      console.log('Starting validation for:', { code, serviceId });

      if (!code.trim()) {
        toast.error('Please enter a reward code');
        return;
      }

      const { data: claim, error: claimError } = await supabase
        .from('reward_claims')
        .select('*, rewards (*)')
        .eq('redemption_code', code)
        .single();

      console.log('Initial claim query result:', { claim, claimError });

      if (claimError || !claim) {
        toast.error('Invalid reward code');
        return;
      }

      if (claim.is_redeemed) {
        toast.error('This reward code has already been redeemed');
        setRewardCodes(prev => ({
          ...prev,
          [serviceId]: ''
        }));
        return;
      }

      const reward = claim.rewards;
      const currentService = services.find(s => s.id === serviceId);
      if (!currentService) {
        toast.error('Service not found');
        return;
      }

      const rewardServiceName = reward.name.split(' off ')[1]?.trim() || reward.name.split('Free ')[1]?.trim();
      const currentServiceName = currentService.name.trim();

      if (rewardServiceName !== currentServiceName) {
        toast.error(`This reward code is only valid for ${rewardServiceName}`);
        return;
      }

      // Immediately update is_redeemed to true
      const { error: updateError } = await supabase
        .from('reward_claims')
        .update({ 
          is_redeemed: true,
          status: 'claimed',
          updated_at: new Date().toISOString()
        })
        .eq('redemption_code', code);

      if (updateError) {
        console.error('Error updating reward status:', updateError);
        toast.error('Failed to apply reward');
        return;
      }

      // Apply the reward
      setRewardCodes(prev => ({
        ...prev,
        [serviceId]: code
      }));

      if (reward.type === 'free') {
        setAppliedReward({
          id: reward.id,
          type: 'free',
          service_id: serviceId
        });
        setDiscountAmount(currentService.price);
        toast.success('Free service reward applied!');
      } else if (reward.type === 'discount' && reward.discount_percentage) {
        const discountAmount = (currentService.price * reward.discount_percentage) / 100;
        setDiscountAmount(discountAmount);
        setAppliedReward({
          id: reward.id,
          type: 'discount',
          service_id: serviceId,
          discount_percentage: reward.discount_percentage
        });
        toast.success(`Discount of ${reward.discount_percentage}% applied!`);
      }

    } catch (error) {
      console.error('Error validating reward code:', error);
      toast.error('Failed to validate reward code');
    } finally {
      setIsApplyingCode(false);
    }
  };

  return (
    <>
      <Modal open={isOpen}>
        <ModalContent className="max-h-[90vh] w-full max-w-6xl overflow-hidden flex flex-col">
          <div className="flex-none">
            <ModalHeader className="space-y-1 p-3 border-b">
              <ModalTitle className="text-xl font-bold">Schedule New Appointment</ModalTitle>
              <p className="text-sm text-muted-foreground">Select services and appointment details</p>
            </ModalHeader>
          </div>

          <Form {...form}>
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                console.log('Form submission started');
                console.log('Current form values:', form.getValues());
                form.handleSubmit(handleSubmit)(e);
              }}
              className="flex flex-col flex-1 overflow-hidden"
            >
              <div className="flex-1 flex overflow-hidden">
                {/* Services Sidebar */}
                <div className="w-80 border-r flex flex-col overflow-hidden">
                  <div className="p-3 border-b">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Package className="w-4 h-4 text-primary" />
                      Available Services
                    </h3>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {isLoadingServices ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                      </div>
                    ) : services.length === 0 ? (
                      <div className="text-center p-8 text-muted-foreground">
                        No services available
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {services.map((service) => (
                          <div
                            key={service.id}
                            className={`p-3 rounded-lg border transition-all
                              ${selectedServices.includes(service.id)
                                ? 'border-primary bg-primary/5 ring-1 ring-primary'
                                : 'border-transparent bg-card hover:border-primary/50 hover:shadow-sm'
                              }`}
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-medium">{service.name}</h4>
                                <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                                  <span>R{service.price}</span>
                                  <span>•</span>
                                  <span>{service.duration}min</span>
                                </div>
                                {appliedReward?.service_id === service.id && (
                                  <div className="text-sm text-green-600 mt-1">
                                    Reward applied!
                                  </div>
                                )}
                              </div>
                              <Button
                                type="button"
                                variant={selectedServices.includes(service.id) ? "default" : "outline"}
                                size="sm"
                                onClick={() => {
                                  const serviceId = service.id;
                                  const newSelectedServices = selectedServices.includes(serviceId)
                                    ? selectedServices.filter(id => id !== serviceId)
                                    : [...selectedServices, serviceId];
                                  setSelectedServices(newSelectedServices);
                                }}
                              >
                                {selectedServices.includes(service.id) ? (
                                  <Check className="w-4 h-4" />
                                ) : (
                                  "Select"
                                )}
                              </Button>
                            </div>
                            {service.description && (
                              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                                {service.description}
                              </p>
                            )}
                            {selectedServices.includes(service.id) && (
                              <div className="mt-3 pt-3 border-t">
                                <div className="flex gap-2">
                                  <Input
                                    value={rewardCodes[service.id] || ''}
                                    onChange={(e) => setRewardCodes(prev => ({
                                      ...prev,
                                      [service.id]: e.target.value
                                    }))}
                                    placeholder="Enter reward code"
                                    className="h-8 text-sm"
                                  />
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => validateRewardCode(rewardCodes[service.id], service.id)}
                                    disabled={isApplyingCode}
                                    className="h-8"
                                  >
                                    {isApplyingCode ? "Validating..." : "Apply"}
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {selectedServices.length > 0 && (
                    <div className="flex-none p-3 border-t bg-background">
                      <div className="text-sm text-muted-foreground">
                        Selected: {selectedServices.length} service(s)
                      </div>
                    </div>
                  )}
                </div>

                {/* Main Content */}
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="flex-1 overflow-y-auto">
                    <div className="p-3 space-y-4">
                      {/* Date & Time and Member Information Cards */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Date and Time Selection */}
                        <Card className="p-4">
                          <div className="space-y-6">
                            {/* Date Selection */}
                            <div className="flex items-center justify-between mb-6">
                              <div className="flex items-center gap-2 text-lg font-semibold">
                                <CalendarCheck className="w-5 h-5 text-primary" />
                                Select Date & Time
                              </div>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="flex items-center gap-2"
                                  >
                                    <CalendarIcon className="w-4 h-4" />
                                    Show Calendar
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="end">
                                  <Calendar
                                    mode="single"
                                    selected={date}
                                    onSelect={(d) => {
                                      if (d) {
                                        setDate(d);
                                        form.setValue('date', d);
                                      }
                                    }}
                                    initialFocus
                                    components={{
                                      IconLeft: () => <ChevronLeft className="h-4 w-4" />,
                                      IconRight: () => <ChevronRight className="h-4 w-4" />,
                                    }}
                                  />
                                </PopoverContent>
                              </Popover>
                            </div>

                            <div className="mb-6">
                              <h3 className="font-medium flex items-center gap-2 mb-3">
                                <User className="w-4 h-4 text-primary" />
                                Select Specialist
                              </h3>
                              <Select
                                value={selectedDoctor}
                                onValueChange={(value) => {
                                  setSelectedDoctor(value);
                                  form.setValue('time', '');
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Choose a specialist" />
                                </SelectTrigger>
                                <SelectContent>
                                  {(doctors || []).map((doctor) => (
                                    <SelectItem key={doctor.name} value={doctor.name}>
                                      {doctor.name} - {doctor.specialization}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
                              {next7Days.map((day) => (
                                <DateButton
                                  key={day.toISOString()}
                                  day={day}
                                  selected={date}
                                  onSelect={(d) => {
                                    setDate(d);
                                    form.setValue('date', d);
                                  }}
                                />
                              ))}
                            </div>

                            {/* Time Slots */}
                            <div className="space-y-4">
                              <h3 className="font-medium flex items-center gap-2">
                                <Clock className="w-4 h-4 text-primary" />
                                Available Time Slots
                              </h3>
                              {!selectedDoctor ? (
                                <div className="text-sm text-muted-foreground">
                                  Please select a specialist first
                                </div>
                              ) : availableTimeSlots.length === 0 ? (
                                <div className="text-sm text-muted-foreground">
                                  No available time slots for this date
                                </div>
                              ) : (
                                <FormField
                                  control={form.control}
                                  name="time"
                                  render={({ field }) => (
                                    <RadioGroup
                                      value={field.value}
                                      onValueChange={field.onChange}
                                      className="grid grid-cols-2 sm:grid-cols-4 gap-2"
                                    >
                                      {availableTimeSlots.map((slot) => (
                                        <div key={slot}>
                                          <RadioGroupItem
                                            value={slot}
                                            id={slot}
                                            className="sr-only"
                                          />
                                          <Label
                                            htmlFor={slot}
                                            className={`flex items-center justify-center px-4 py-3 rounded-xl border text-sm transition-all
                                              ${field.value === slot
                                                ? 'bg-primary text-primary-foreground border-primary'
                                                : 'cursor-pointer hover:border-primary'}`}
                                          >
                                            {slot}
                                          </Label>
                                        </div>
                                      ))}
                                    </RadioGroup>
                                  )}
                                />
                              )}
                            </div>
                          </div>
                        </Card>

                        {/* Member Information */}
                        <Card className="p-4">
                          <div className="flex items-center gap-2 text-base font-semibold mb-6">
                            <User className="w-5 h-5 text-primary" />
                            Member Information
                          </div>
                          
                          <div className="space-y-4">
                            <FormField
                              control={form.control}
                              name="patient"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="flex items-center gap-3 text-sm">
                                    <User className="w-4 h-4" />
                                    Full Name
                                  </FormLabel>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      placeholder="Enter patient name"
                                      className="h-10"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="email"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="flex items-center gap-3 text-sm">
                                    <Mail className="w-4 h-4" />
                                    Email
                                  </FormLabel>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      type="email"
                                      placeholder="Enter email address"
                                      className="h-10"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="phone"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="flex items-center gap-3 text-sm">
                                    <Phone className="w-4 h-4" />
                                    Phone
                                  </FormLabel>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      type="tel"
                                      placeholder="Enter phone number"
                                      className="h-10"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </Card>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex-none p-3 border-t bg-background">
                <div className="flex justify-between items-center">
                  <div className="text-sm text-muted-foreground">
                    {selectedServices.length > 0 && (
                      <div className="space-y-1">
                        <div>
                          Subtotal: R{services
                            .filter(s => selectedServices.includes(s.id))
                            .reduce((sum, s) => sum + s.price, 0)}
                        </div>
                        {discountAmount > 0 && (
                          <div className="text-green-600">
                            Discount: -R{discountAmount}
                          </div>
                        )}
                        <div className="font-medium">
                          Total: R{services
                            .filter(s => selectedServices.includes(s.id))
                            .reduce((sum, s) => sum + s.price, 0) - discountAmount}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <Button type="button" variant="outline" onClick={onClose}>
                      Cancel
                    </Button>
                    <Button 
                      type="submit"
                      disabled={!form.getValues('date') || !form.getValues('time') || selectedServices.length === 0}
                    >
                      Create Appointment
                    </Button>
                  </div>
                </div>
              </div>
            </form>
          </Form>
        </ModalContent>
      </Modal>
    </>
  );
};

export default AddAppointmentModal; 