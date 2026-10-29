import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/config/supabase';
import { toast } from 'sonner';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { DashboardLayout } from "@/components/Dashboard/DashboardLayout";
import { LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Checkbox } from '@/components/ui/checkbox';
import { AddressAutocomplete } from '@/components/AddressAutocomplete';

// Import your types from Onboarding or create a separate types file
import type { PracticeData, BusinessHours, DoctorProfile, ServicePrice } from '@/types/practice';

interface DoctorAvailability {
  isAvailable: boolean;
  usePracticeHours: boolean;
  customHours: {
    start: string;
    end: string;
  };
}

const days = [
  { key: 'monday' as const, label: 'Monday' },
  { key: 'tuesday' as const, label: 'Tuesday' },
  { key: 'wednesday' as const, label: 'Wednesday' },
  { key: 'thursday' as const, label: 'Thursday' },
  { key: 'friday' as const, label: 'Friday' },
  { key: 'saturday' as const, label: 'Saturday' },
  { key: 'sunday' as const, label: 'Sunday' },
];

export default function Settings() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [practiceData, setPracticeData] = useState<PracticeData | null>(null);

  useEffect(() => {
    loadPracticeData();
  }, []);

  const loadPracticeData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { data: practice, error } = await supabase
        .from('practices')
        .select('*, doctors')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      setPracticeData(practice);
    } catch (error) {
      console.error('Error loading practice data:', error);
      toast.error('Failed to load practice data');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (section: keyof PracticeData, data: any) => {
    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { error } = await supabase
        .from('practices')
        .update({ [section]: data })
        .eq('id', user.id);

      if (error) throw error;

      setPracticeData(prev => prev ? { ...prev, [section]: data } : null);
      toast.success('Settings updated successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      toast.success('Logged out successfully');
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error);
      toast.error('Failed to log out');
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <SettingsSkeleton />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Practice Settings
            </h1>
            <p className="text-gray-600 mt-2">
              Manage your practice information and preferences
            </p>
          </div>
          <Button 
            variant="outline" 
            className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>

        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="bg-white border-b border-gray-200 w-full justify-start space-x-8 px-4">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="hours">Business Hours</TabsTrigger>
            <TabsTrigger value="services">Services & Insurance</TabsTrigger>
            <TabsTrigger value="rewards">Rewards Program</TabsTrigger>
            <TabsTrigger value="doctors">Doctors</TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <GeneralSettings 
              practiceData={practiceData} 
              onSave={async (data) => {
                const { name, email, phone, address, city, province, postal_code, display_picture, category } = data;
                await Promise.all([
                  handleSave('name', name),
                  handleSave('email', email),
                  handleSave('phone', phone),
                  handleSave('address', address),
                  handleSave('city', city),
                  handleSave('province', province),
                  handleSave('postal_code', postal_code),
                  handleSave('display_picture', display_picture),
                  handleSave('category', category)
                ]);
              }}
              saving={saving}
            />
          </TabsContent>

          <TabsContent value="hours">
            <BusinessHoursSettings 
              practiceData={practiceData} 
              onSave={(data) => handleSave('business_hours', data)}
              saving={saving}
            />
          </TabsContent>

          <TabsContent value="services">
            <ServicesSettings 
              practiceData={practiceData} 
              onSave={(data) => handleSave('services', data)}
              saving={saving}
            />
          </TabsContent>

          <TabsContent value="rewards">
            <RewardsSettings 
              practiceData={practiceData} 
              onSave={async (data) => {
                await handleSave('rewards', {
                  percentage_reward: parseFloat(data.percentage_reward),
                  referral_points: parseInt(data.referral_points)
                });
              }}
              saving={saving}
            />
          </TabsContent>

          <TabsContent value="doctors">
            <DoctorsSettings 
              practiceData={practiceData} 
              onSave={(data) => handleSave('doctors', data.doctors)}
              saving={saving}
            />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

// Individual section components
function GeneralSettings({ practiceData, onSave, saving }: SettingsSectionProps) {
  const [formData, setFormData] = useState({
    name: practiceData?.name || '',
    email: practiceData?.email || '',
    phone: practiceData?.phone || '',
    address: practiceData?.address || '',
    city: practiceData?.city || '',
    province: practiceData?.province || '',
    postal_code: practiceData?.postal_code || '',
    display_picture: practiceData?.display_picture || null,
    category: practiceData?.category || '',
  });
  const [uploading, setUploading] = useState(false);

  const handleAddressSelect = (addressData: {
    address: string;
    city: string;
    province: string;
    postal_code: string;
  }) => {
    setFormData(prev => ({
      ...prev,
      ...addressData
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;

      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `practice-logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(filePath);

      setFormData(prev => ({
        ...prev,
        display_picture: publicUrl
      }));
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>General Information</CardTitle>
        <CardDescription>Update your practice's basic information</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex items-center space-x-6 mb-4">
            <div className="shrink-0">
              <img
                className="h-24 w-24 object-cover rounded-lg border border-gray-200"
                src={formData.display_picture || '/placeholder-logo.png'}
                alt="Practice logo"
              />
            </div>
            <label className="block">
              <span className="sr-only">Choose practice logo</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={uploading}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-full file:border-0
                  file:text-sm file:font-semibold
                  file:bg-primary file:text-white
                  hover:file:bg-primary/90
                  disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="practiceName">Practice Name</Label>
              <Input
                id="practiceName"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  name: e.target.value
                }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Practice Category</Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  category: e.target.value
                }))}
                placeholder="e.g., Dental Practice, Medical Practice, etc."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  email: e.target.value
                }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <PhoneInput
                country={'za'}
                value={formData.phone}
                onChange={(phone) => setFormData(prev => ({
                  ...prev,
                  phone: phone
                }))}
                containerClass="w-full"
                inputClass="w-full px-4 py-2 rounded-lg border border-gray-200"
              />
            </div>

            <div className="col-span-2 space-y-2">
              <Label htmlFor="address">Address</Label>
              <AddressAutocomplete
                onAddressSelect={handleAddressSelect}
                defaultValue={formData.address}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  city: e.target.value
                }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="province">Province</Label>
              <Input
                id="province"
                value={formData.province}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  province: e.target.value
                }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="postal_code">Postal Code</Label>
              <Input
                id="postal_code"
                value={formData.postal_code}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  postal_code: e.target.value
                }))}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function BusinessHoursSettings({ practiceData, onSave, saving }: SettingsSectionProps) {
  const [businessHours, setBusinessHours] = useState<BusinessHours>({
    monday: { start: practiceData?.business_hours?.monday?.start || '09:00', end: practiceData?.business_hours?.monday?.end || '17:00', isOpen: practiceData?.business_hours?.monday?.isOpen ?? true },
    tuesday: { start: practiceData?.business_hours?.tuesday?.start || '09:00', end: practiceData?.business_hours?.tuesday?.end || '17:00', isOpen: practiceData?.business_hours?.tuesday?.isOpen ?? true },
    wednesday: { start: practiceData?.business_hours?.wednesday?.start || '09:00', end: practiceData?.business_hours?.wednesday?.end || '17:00', isOpen: practiceData?.business_hours?.wednesday?.isOpen ?? true },
    thursday: { start: practiceData?.business_hours?.thursday?.start || '09:00', end: practiceData?.business_hours?.thursday?.end || '17:00', isOpen: practiceData?.business_hours?.thursday?.isOpen ?? true },
    friday: { start: practiceData?.business_hours?.friday?.start || '09:00', end: practiceData?.business_hours?.friday?.end || '17:00', isOpen: practiceData?.business_hours?.friday?.isOpen ?? true },
    saturday: { start: practiceData?.business_hours?.saturday?.start || '09:00', end: practiceData?.business_hours?.saturday?.end || '17:00', isOpen: practiceData?.business_hours?.saturday?.isOpen ?? false },
    sunday: { start: practiceData?.business_hours?.sunday?.start || '09:00', end: practiceData?.business_hours?.sunday?.end || '17:00', isOpen: practiceData?.business_hours?.sunday?.isOpen ?? false },
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (practiceData?.business_hours) {
      setBusinessHours(practiceData.business_hours);
      setLoading(false);
    }
  }, [practiceData]);

  const handleTimeChange = (day: keyof BusinessHours, field: 'start' | 'end', value: string) => {
    setBusinessHours(prev => ({
      ...prev,
      [day]: { ...prev[day], [field]: value }
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(businessHours);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Business Hours</CardTitle>
        <CardDescription>Set your practice's operating hours</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            {days.map(({ key, label }) => (
              <div key={key} className="grid grid-cols-12 gap-4 items-center">
                <div className="col-span-3">
                  <Label>{label}</Label>
                </div>
                <div className="col-span-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={businessHours[key].isOpen}
                      onChange={(e) => setBusinessHours(prev => ({
                        ...prev,
                        [key]: { ...prev[key], isOpen: e.target.checked }
                      }))}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <Label>Open</Label>
                  </div>
                </div>
                <div className="col-span-3">
                  <Input
                    type="time"
                    value={businessHours[key].start}
                    onChange={(e) => handleTimeChange(key, 'start', e.target.value)}
                    disabled={!businessHours[key].isOpen}
                  />
                </div>
                <div className="col-span-3">
                  <Input
                    type="time"
                    value={businessHours[key].end}
                    onChange={(e) => handleTimeChange(key, 'end', e.target.value)}
                    disabled={!businessHours[key].isOpen}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function ServicesSettings({ practiceData, onSave, saving }: SettingsSectionProps) {
  const [services, setServices] = useState<ServicePrice[]>(
    practiceData?.services || []
  );
  const [specialties, setSpecialties] = useState<string[]>(
    practiceData?.specialties || []
  );
  const [acceptedInsurances, setAcceptedInsurances] = useState<string[]>(
    practiceData?.accepted_insurances || []
  );
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [insuranceSearchTerm, setInsuranceSearchTerm] = useState('');
  const insuranceDropdownRef = useRef<HTMLDivElement>(null);

  const specialtyOptions: { name: string }[] = [
    { name: 'General Practice' },
    { name: 'Pediatrics' },
    { name: 'Cardiology' },
    { name: 'Dermatology' },
    { name: 'Orthopedics' },
    { name: 'Dentistry' },
    { name: 'Gynecology' },
    { name: 'Ophthalmology' },
    { name: 'Neurology' },
    { name: 'Psychiatry' }
  ];

  const commonInsuranceProviders = [
    'Discovery Health',
    'Bonitas',
    'Momentum Health',
    'Medihelp',
    'Medshield',
    'GEMS',
    'Bestmed',
    'Fedhealth',
    'Sizwe Medical Fund',
    'Keyhealth'
  ];

  useEffect(() => {
    if (practiceData) {
      setServices(practiceData.services || []);
      setSpecialties(practiceData.specialties || []);
      setAcceptedInsurances(practiceData.accepted_insurances || []);
    }
  }, [practiceData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      services,
      specialties,
      accepted_insurances: acceptedInsurances
    });
  };

  const handleSpecialtyAdd = (specialty: string) => {
    if (!specialties.includes(specialty)) {
      setSpecialties(prev => [...prev, specialty]);
    }
    setSearchTerm('');
  };

  const handleSpecialtyRemove = (specialty: string) => {
    setSpecialties(prev => prev.filter(s => s !== specialty));
  };

  const handleInsuranceAdd = (insurance: string) => {
    if (!acceptedInsurances.includes(insurance)) {
      setAcceptedInsurances(prev => [...prev, insurance]);
    }
    setInsuranceSearchTerm('');
  };

  const handleInsuranceRemove = (insurance: string) => {
    setAcceptedInsurances(prev => prev.filter(ins => ins !== insurance));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Specialties</CardTitle>
          <CardDescription>Add your practice specialties</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2 mb-3">
              {specialties.map((specialty) => (
                <div
                  key={specialty}
                  className="flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm"
                >
                  <span>{specialty}</span>
                  <button
                    type="button"
                    onClick={() => handleSpecialtyRemove(specialty)}
                    className="ml-1 text-blue-500 hover:text-blue-700"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>

            <div className="relative" ref={dropdownRef}>
              <Input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search or add specialty..."
                className="w-full"
              />
              {searchTerm && (
                <div className="absolute z-10 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 max-h-60 overflow-auto">
                  {specialtyOptions
                    .filter(option => 
                      !specialties.includes(option.name) &&
                      option.name.toLowerCase().includes(searchTerm.toLowerCase())
                    ).length > 0 ? (
                    specialtyOptions
                      .filter(option => 
                        !specialties.includes(option.name) &&
                        option.name.toLowerCase().includes(searchTerm.toLowerCase())
                      )
                      .map((option) => (
                        <button
                          key={option.name}
                          type="button"
                          onClick={() => handleSpecialtyAdd(option.name)}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700"
                        >
                          {option.name}
                        </button>
                      ))
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSpecialtyAdd(searchTerm)}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700"
                    >
                      Add "{searchTerm}" as custom specialty
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Services & Pricing</CardTitle>
          <CardDescription>Add your services and their pricing</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {services.map((service, index) => (
              <div key={index} className="grid grid-cols-12 gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="col-span-5">
                  <Label>Service Name</Label>
                  <Input
                    value={service.name}
                    onChange={(e) => {
                      const updatedServices = [...services];
                      updatedServices[index].name = e.target.value;
                      setServices(updatedServices);
                    }}
                    placeholder="e.g., Consultation"
                  />
                </div>
                
                <div className="col-span-3">
                  <Label>Price (ZAR)</Label>
                  <Input
                    type="number"
                    value={service.price}
                    onChange={(e) => {
                      const updatedServices = [...services];
                      updatedServices[index].price = Number(e.target.value);
                      setServices(updatedServices);
                    }}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>

                <div className="col-span-3">
                  <Label>Description</Label>
                  <Input
                    value={service.description || ''}
                    onChange={(e) => {
                      const updatedServices = [...services];
                      updatedServices[index].description = e.target.value;
                      setServices(updatedServices);
                    }}
                    placeholder="Optional description"
                  />
                </div>

                <div className="col-span-1 flex items-end">
                  <button
                    type="button"
                    onClick={() => setServices(prev => prev.filter((_, i) => i !== index))}
                    className="p-2 text-red-500 hover:text-red-700"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => setServices(prev => [...prev, { name: '', price: 0, description: '' }])}
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Service
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Accepted Insurance Providers</CardTitle>
          <CardDescription>Select the insurance providers you accept</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2 mb-3">
              {acceptedInsurances.map((insurance) => (
                <div
                  key={insurance}
                  className="flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm"
                >
                  <span>{insurance}</span>
                  <button
                    type="button"
                    onClick={() => handleInsuranceRemove(insurance)}
                    className="ml-1 text-blue-500 hover:text-blue-700"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>

            <div className="relative" ref={insuranceDropdownRef}>
              <Input
                type="text"
                value={insuranceSearchTerm}
                onChange={(e) => setInsuranceSearchTerm(e.target.value)}
                placeholder="Search or add insurance provider..."
                className="w-full"
              />
              {insuranceSearchTerm && (
                <div className="absolute z-10 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 max-h-60 overflow-auto">
                  {commonInsuranceProviders
                    .filter(provider => 
                      !acceptedInsurances.includes(provider) &&
                      provider.toLowerCase().includes(insuranceSearchTerm.toLowerCase())
                    ).length > 0 ? (
                    commonInsuranceProviders
                      .filter(provider => 
                        !acceptedInsurances.includes(provider) &&
                        provider.toLowerCase().includes(insuranceSearchTerm.toLowerCase())
                      )
                      .map((provider) => (
                        <button
                          key={provider}
                          type="button"
                          onClick={() => handleInsuranceAdd(provider)}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700"
                        >
                          {provider}
                        </button>
                      ))
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleInsuranceAdd(insuranceSearchTerm)}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700"
                    >
                      Add "{insuranceSearchTerm}" as custom provider
                    </button>
                  )}
                </div>
              )}
            </div>

            {acceptedInsurances.length > 0 && (
              <div className="mt-4 text-sm text-gray-500">
                <p>Click on a tag to remove it</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
}

function RewardsSettings({ practiceData, onSave, saving }: SettingsSectionProps) {
  const [rewardPercentage, setRewardPercentage] = useState<string>(
    (practiceData?.rewards?.percentage_reward || 1).toString()
  );
  const [referralPoints, setReferralPoints] = useState<string>(
    (practiceData?.rewards?.referral_points || 100).toString()
  );

  useEffect(() => {
    if (practiceData?.rewards) {
      setRewardPercentage((practiceData.rewards.percentage_reward || 1).toString());
      setReferralPoints((practiceData.rewards.referral_points || 100).toString());
    }
  }, [practiceData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      percentage_reward: parseFloat(rewardPercentage),
      referral_points: parseInt(referralPoints)
    });
  };

  const calculatedReward = (500 * (Number(rewardPercentage) || 0) / 100).toFixed(0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rewards Program</CardTitle>
        <CardDescription>Configure your practice's rewards program</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-blue-50 p-4 rounded-lg space-y-4">
            <h3 className="font-medium text-blue-900">How Points Work</h3>
            <p className="text-sm text-blue-700 mb-4">
              Points have a direct 1:1 value with Rands. Every 1 point = R1 that members can redeem.
            </p>
            <div className="space-y-2">
              <Label htmlFor="rewardPercentage">Reward Percentage</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="rewardPercentage"
                  type="number"
                  min="0"
                  max="100"
                  value={rewardPercentage}
                  onChange={(e) => setRewardPercentage(e.target.value)}
                  className="w-24"
                />
                <span className="text-sm text-blue-700">% of purchase value as points</span>
              </div>
              <p className="text-sm text-blue-700">
                Example: With {rewardPercentage || 0}% rewards, a R500 purchase will earn {calculatedReward} points = R{calculatedReward} value
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="referralPoints">Referral Bonus Points</Label>
            <Input
              id="referralPoints"
              type="number"
              min="0"
              value={referralPoints}
              onChange={(e) => setReferralPoints(e.target.value)}
              placeholder="Enter points for successful referral"
            />
            <p className="text-sm text-gray-500">
              Points awarded to both the referrer and new member upon successful referral
            </p>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function DoctorsSettings({ practiceData, onSave, saving }: SettingsSectionProps) {
  const [doctors, setDoctors] = useState<DoctorProfile[]>([]);

  useEffect(() => {
    if (practiceData?.doctors) {
      setDoctors(practiceData.doctors);
    }
  }, [practiceData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ doctors });
  };

  // Add this console log to debug
  console.log('Current doctors:', doctors);

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Practice Specialists</CardTitle>
          <CardDescription>Manage your practice specialists and their availability</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {doctors.map((doctor, index) => (
              <div key={index} className="p-6 bg-gray-50 rounded-xl space-y-6">
                <div className="flex justify-between items-start">
                  <div className="grid grid-cols-2 gap-4 flex-grow">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Specialist Name
                      </label>
                      <Input
                        type="text"
                        value={doctor.name}
                        onChange={(e) => {
                          const updated = [...doctors];
                          updated[index].name = e.target.value;
                          setDoctors(updated);
                        }}
                        placeholder="Dr. John Doe"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Specialization
                      </label>
                      <Input
                        type="text"
                        value={doctor.specialization}
                        onChange={(e) => {
                          const updated = [...doctors];
                          updated[index].specialization = e.target.value;
                          setDoctors(updated);
                        }}
                        placeholder="e.g., Pediatrics"
                      />
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setDoctors(prev => prev.filter((_, i) => i !== index))}
                    className="text-red-500 hover:text-red-700"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </Button>
                </div>

                <div className="space-y-4">
                  <label className="block text-sm font-medium text-gray-700">
                    Availability
                  </label>
                  {Object.entries(doctor.availability).map(([day, availability]) => (
                    <div key={day} className="p-4 bg-white rounded-lg">
                      <div className="flex flex-col space-y-3">
                        <div className="flex items-center space-x-3">
                          <Checkbox
                            checked={availability.isAvailable}
                            onCheckedChange={(checked) => {
                              const updated = [...doctors];
                              updated[index].availability[day].isAvailable = checked === true;
                              setDoctors(updated);
                            }}
                          />
                          <span className="text-sm font-medium text-gray-700 capitalize">{day}</span>
                        </div>

                        {availability.isAvailable && (
                          <div className="ml-7 space-y-3">
                            <div className="flex items-center space-x-3">
                              <Checkbox
                                checked={availability.usePracticeHours}
                                onCheckedChange={(checked) => {
                                  const updated = [...doctors];
                                  updated[index].availability[day].usePracticeHours = checked === true;
                                  setDoctors(updated);
                                }}
                              />
                              <span className="text-sm text-gray-600">Use practice hours</span>
                            </div>

                            {!availability.usePracticeHours && (
                              <div className="flex items-center space-x-3">
                                <Input
                                  type="time"
                                  value={availability.customHours.start}
                                  onChange={(e) => {
                                    const updated = [...doctors];
                                    updated[index].availability[day].customHours.start = e.target.value;
                                    setDoctors(updated);
                                  }}
                                />
                                <span className="text-gray-500">to</span>
                                <Input
                                  type="time"
                                  value={availability.customHours.end}
                                  onChange={(e) => {
                                    const updated = [...doctors];
                                    updated[index].availability[day].customHours.end = e.target.value;
                                    setDoctors(updated);
                                  }}
                                />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => setDoctors(prev => [...prev, {
                name: '',
                specialization: '',
                availability: {
                  monday: { isAvailable: true, usePracticeHours: true, customHours: { start: '09:00', end: '17:00' } },
                  tuesday: { isAvailable: true, usePracticeHours: true, customHours: { start: '09:00', end: '17:00' } },
                  wednesday: { isAvailable: true, usePracticeHours: true, customHours: { start: '09:00', end: '17:00' } },
                  thursday: { isAvailable: true, usePracticeHours: true, customHours: { start: '09:00', end: '17:00' } },
                  friday: { isAvailable: true, usePracticeHours: true, customHours: { start: '09:00', end: '17:00' } },
                  saturday: { isAvailable: true, usePracticeHours: true, customHours: { start: '09:00', end: '17:00' } },
                  sunday: { isAvailable: true, usePracticeHours: true, customHours: { start: '09:00', end: '17:00' } }
                }
              }])}
            >
              Add Specialist
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
}

function SettingsSkeleton() {
  return (
    <div className="container mx-auto py-8 max-w-7xl space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-10 w-1/4" />
        <Skeleton className="h-4 w-1/3" />
      </div>
      
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-[200px]" />
          <Skeleton className="h-[200px]" />
        </div>
      </div>
    </div>
  );
}

interface SettingsSectionProps {
  practiceData: PracticeData | null;
  onSave: (data: any) => Promise<void>;
  saving: boolean;
}