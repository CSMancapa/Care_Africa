import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../config/supabase';
import { toast } from 'react-hot-toast';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import logoIcon from '../../assets/img/Logo.png';
/// <reference types="@types/google.maps" />
import { Session } from '@supabase/supabase-js';

interface BusinessHours {
  start: string;
  end: string;
  isOpen: boolean;
}

interface DoctorAvailability {
  isAvailable: boolean;
  usePracticeHours: boolean;
  customHours: {
    start: string;
    end: string;
  };
}

interface DoctorProfile {
  name: string;
  specialization: string;
  availability: {
    monday: DoctorAvailability;
    tuesday: DoctorAvailability;
    wednesday: DoctorAvailability;
    thursday: DoctorAvailability;
    friday: DoctorAvailability;
    saturday: DoctorAvailability;
    sunday: DoctorAvailability;
  };
}

interface PracticeData {
  practiceName: string;
  email: string;
  address: string;
  phone: string;
  displayPicture: string | null;
  businessHours: {
    monday: BusinessHours;
    tuesday: BusinessHours;
    wednesday: BusinessHours;
    thursday: BusinessHours;
    friday: BusinessHours;
    saturday: BusinessHours;
    sunday: BusinessHours;
  };
  specialties: string[];
  doctors: DoctorProfile[];
  selectedRewardCampaigns: string[];
  pointsRules: {
    perVisit: number;
    perReferral: number;
    perReview: number;
  };
}

const defaultBusinessHours: BusinessHours = {
  start: '09:00',
  end: '17:00',
  isOpen: true
};

const specialtyOptions = [
  'General Practice',
  'Pediatrics',
  'Cardiology',
  'Dermatology',
  'Orthopedics',
  'Dentistry',
  'Other'
];

const rewardCampaignOptions = [
  'Birthday Rewards',
  'Referral Program',
  'Loyalty Points',
  'First Visit Bonus',
  'Review Rewards'
];

export const Onboarding = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [practiceData, setPracticeData] = useState<PracticeData>({
    practiceName: '',
    email: '',
    address: '',
    phone: '',
    displayPicture: null,
    businessHours: {
      monday: { ...defaultBusinessHours },
      tuesday: { ...defaultBusinessHours },
      wednesday: { ...defaultBusinessHours },
      thursday: { ...defaultBusinessHours },
      friday: { ...defaultBusinessHours },
      saturday: { ...defaultBusinessHours, isOpen: false },
      sunday: { ...defaultBusinessHours, isOpen: false }
    },
    specialties: [],
    doctors: [],
    selectedRewardCampaigns: [],
    pointsRules: {
      perVisit: 100,
      perReferral: 50,
      perReview: 25
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentStep(prev => prev + 1);
  };

  const validateCurrentStep = () => {
    switch (currentStep) {
      case 1:
        // Validate practice information
        if (!practiceData.practiceName || !practiceData.email || !practiceData.address || !practiceData.phone) {
          toast.error('Please fill in all required fields');
          return false;
        }
        return true;
      // Add validation for other steps
      case 2:
        // Validate business hours
        return true;
      case 3:
        // Validate services
        return true;
      case 4:
        // Validate rewards
        return true;
      default:
        return false;
    }
  };

  const handleFinalSubmission = async () => {
    // Handle the final submission to your backend
    try {
      // Add your submission logic here
      toast.success('Practice setup completed successfully!');
      navigate('/dashboard'); // Navigate to dashboard after completion
    } catch (error) {
      console.error('Submission error:', error);
      toast.error('Failed to complete setup. Please try again.');
    }
  };

  const addDoctor = () => {
    const defaultAvailability: DoctorAvailability = {
      isAvailable: true,
      usePracticeHours: true,
      customHours: {
        start: '09:00',
        end: '17:00'
      }
    };

    setPracticeData(prev => ({
      ...prev,
      doctors: [
        ...prev.doctors,
        {
          name: '',
          specialization: '',
          availability: {
            monday: { ...defaultAvailability },
            tuesday: { ...defaultAvailability },
            wednesday: { ...defaultAvailability },
            thursday: { ...defaultAvailability },
            friday: { ...defaultAvailability },
            saturday: { ...defaultAvailability, isAvailable: false },
            sunday: { ...defaultAvailability, isOpen: false }
          }
        }
      ]
    }));
  };

  const removeDoctor = (index: number) => {
    setPracticeData(prev => ({
      ...prev,
      doctors: prev.doctors.filter((_, i) => i !== index)
    }));
  };

  const renderDoctorAvailability = (doctor: DoctorProfile, index: number) => (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-gray-700 mb-3">
        Availability
      </label>
      {Object.entries(doctor.availability).map(([day, availability]) => (
        <div key={day} className="p-4 bg-gray-50 rounded-lg">
          <div className="flex flex-col space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={availability.isAvailable}
                  onChange={(e) => {
                    const updatedDoctors = [...practiceData.doctors];
                    updatedDoctors[index] = {
                      ...doctor,
                      availability: {
                        ...doctor.availability,
                        [day]: {
                          ...availability,
                          isAvailable: e.target.checked
                        }
                      }
                    };
                    setPracticeData(prev => ({
                      ...prev,
                      doctors: updatedDoctors
                    }));
                  }}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="text-sm font-medium text-gray-700 capitalize">{day}</span>
              </div>
            </div>

            {availability.isAvailable && (
              <div className="ml-7 space-y-3">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={availability.usePracticeHours}
                    onChange={(e) => {
                      const updatedDoctors = [...practiceData.doctors];
                      updatedDoctors[index] = {
                        ...doctor,
                        availability: {
                          ...doctor.availability,
                          [day]: {
                            ...availability,
                            usePracticeHours: e.target.checked
                          }
                        }
                      };
                      setPracticeData(prev => ({
                        ...prev,
                        doctors: updatedDoctors
                      }));
                    }}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-600">Use practice hours</span>
                </div>

                {!availability.usePracticeHours && (
                  <div className="flex items-center space-x-3">
                    <input
                      type="time"
                      value={availability.customHours.start}
                      onChange={(e) => {
                        const updatedDoctors = [...practiceData.doctors];
                        updatedDoctors[index] = {
                          ...doctor,
                          availability: {
                            ...doctor.availability,
                            [day]: {
                              ...availability,
                              customHours: {
                                ...availability.customHours,
                                start: e.target.value
                              }
                            }
                          }
                        };
                        setPracticeData(prev => ({
                          ...prev,
                          doctors: updatedDoctors
                        }));
                      }}
                      className="block px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <span className="text-gray-500">to</span>
                    <input
                      type="time"
                      value={availability.customHours.end}
                      onChange={(e) => {
                        const updatedDoctors = [...practiceData.doctors];
                        updatedDoctors[index] = {
                          ...doctor,
                          availability: {
                            ...doctor.availability,
                            [day]: {
                              ...availability,
                              customHours: {
                                ...availability.customHours,
                                end: e.target.value
                              }
                            }
                          }
                        };
                        setPracticeData(prev => ({
                          ...prev,
                          doctors: updatedDoctors
                        }));
                      }}
                      className="block px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                )}

                {availability.usePracticeHours && (
                  <div className="text-sm text-gray-500 italic">
                    Using practice hours: {practiceData.businessHours[day as keyof typeof practiceData.businessHours].start} - {practiceData.businessHours[day as keyof typeof practiceData.businessHours].end}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        // You can add image upload logic here
        // For now, we'll use a local URL
        const imageUrl = URL.createObjectURL(file);
        setPracticeData(prev => ({
          ...prev,
          displayPicture: imageUrl
        }));
      } catch (error) {
        console.error('Error uploading image:', error);
        toast.error('Failed to upload image');
      }
    }
  };

  const handleDayToggle = (day: string, isOpen: boolean) => {
    setPracticeData(prev => ({
      ...prev,
      businessHours: {
        ...prev.businessHours,
        [day]: {
          ...prev.businessHours[day as keyof typeof prev.businessHours],
          isOpen
        }
      }
    }));
  };

  const handleTimeChange = (day: string, field: 'start' | 'end', value: string) => {
    setPracticeData(prev => ({
      ...prev,
      businessHours: {
        ...prev.businessHours,
        [day]: {
          ...prev.businessHours[day as keyof typeof prev.businessHours],
          [field]: value
        }
      }
    }));
  };

  const setAllDaysHours = (start: string, end: string, isOpen: boolean) => {
    const updatedHours = Object.keys(practiceData.businessHours).reduce((acc, day) => ({
      ...acc,
      [day]: {
        start,
        end,
        isOpen: day === 'saturday' || day === 'sunday' ? false : isOpen
      }
    }), {} as typeof practiceData.businessHours);

    setPracticeData(prev => ({
      ...prev,
      businessHours: updatedHours
    }));
  };

  const getRewardDescription = (campaign: string): string => {
    const descriptions: { [key: string]: string } = {
      'Birthday Rewards': 'Send special rewards to patients on their birthday',
      'Referral Program': 'Reward patients for referring new patients to your practice',
      'Loyalty Points': 'Patients earn points for visits and treatments',
      'First Visit Bonus': 'Welcome new patients with bonus points',
      'Review Rewards': 'Reward patients for leaving reviews'
    };
    return descriptions[campaign] || '';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation Bar */}
      <div className="bg-white border-b border-gray-200 fixed top-0 left-0 right-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <img 
              src={logoIcon} 
              alt="Care Africa" 
              className="h-8"
            />
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">Need help?</span>
              <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">Contact Support</button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="pt-16 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-12 gap-8">
            {/* Left Column - Progress and Info */}
            <div className="col-span-3">
              <div className="sticky top-24">
                <div className="space-y-6">
                  {/* Progress Steps */}
                  <div className="bg-white rounded-xl p-6 shadow-sm">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Setup Progress</h3>
                    <div className="space-y-4">
                      {['Practice Details', 'Business Hours', 'Services', 'Rewards'].map((step, index) => (
                        <div key={index} className="flex items-center">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            index + 1 <= currentStep
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-100 text-gray-400'
                          }`}>
                            {index + 1}
                          </div>
                          <span className={`ml-3 text-sm ${
                            index + 1 <= currentStep ? 'text-gray-900' : 'text-gray-500'
                          }`}>
                            {step}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Help Box */}
                  <div className="bg-gradient-to-br from-blue-50 to-orange-50 rounded-xl p-6">
                    <h3 className="text-sm font-medium text-blue-800 mb-2">Need Assistance?</h3>
                    <p className="text-sm text-blue-700 mb-4">
                      Our support team is here to help you get started with Care Africa.
                    </p>
                    <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                      View Setup Guide →
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Main Form */}
            <div className="col-span-9">
              <form onSubmit={handleSubmit}>
                {/* Step 1 - Practice Details */}
                {currentStep === 1 && (
                  <div className="bg-white rounded-xl shadow-sm p-8">
                    <div className="mb-8">
                      <h2 className="text-2xl font-bold text-gray-900">Practice Details</h2>
                      <p className="mt-2 text-gray-600">Tell us about your practice</p>
                    </div>

                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Practice Name
                        </label>
                        <input
                          type="text"
                          value={practiceData.practiceName}
                          onChange={(e) => setPracticeData(prev => ({
                            ...prev,
                            practiceName: e.target.value
                          }))}
                          className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Email Address
                        </label>
                        <input
                          type="email"
                          value={practiceData.email}
                          onChange={(e) => setPracticeData(prev => ({
                            ...prev,
                            email: e.target.value
                          }))}
                          className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Practice Address
                        </label>
                        <input
                          type="text"
                          value={practiceData.address}
                          onChange={(e) => setPracticeData(prev => ({
                            ...prev,
                            address: e.target.value
                          }))}
                          className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Phone Number
                        </label>
                        <PhoneInput
                          country={'za'}
                          value={practiceData.phone}
                          onChange={(phone) => setPracticeData(prev => ({
                            ...prev,
                            phone: phone
                          }))}
                          containerClass="w-full"
                          inputClass="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Practice Logo
                        </label>
                        <div className="mt-1 flex items-center space-x-4">
                          {practiceData.displayPicture ? (
                            <img
                              src={practiceData.displayPicture}
                              alt="Practice logo"
                              className="h-12 w-12 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="h-12 w-12 rounded-lg bg-gray-100 flex items-center justify-center">
                              <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          )}
                          <label className="cursor-pointer bg-white px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                            <span className="text-sm font-medium text-gray-600">Upload Logo</span>
                            <input
                              type="file"
                              className="hidden"
                              accept="image/*"
                              onChange={handleImageUpload}
                            />
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 2 - Business Hours */}
                {currentStep === 2 && (
                  <div className="bg-white rounded-xl shadow-sm p-8">
                    <div className="mb-8">
                      <h2 className="text-2xl font-bold text-gray-900">Business Hours</h2>
                      <p className="mt-2 text-gray-600">Set your practice's operating hours</p>
                    </div>

                    <div className="space-y-6">
                      {/* Quick Actions */}
                      <div className="flex items-center space-x-4 mb-6">
                        <button
                          type="button"
                          onClick={() => setAllDaysHours('09:00', '17:00', true)}
                          className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                        >
                          Set Standard Hours (9-5)
                        </button>
                        <button
                          type="button"
                          onClick={() => setAllDaysHours('08:00', '18:00', true)}
                          className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                        >
                          Set Extended Hours (8-6)
                        </button>
                      </div>

                      {/* Days Grid */}
                      <div className="grid gap-4">
                        {Object.entries(practiceData.businessHours).map(([day, hours]) => (
                          <div 
                            key={day}
                            className="bg-gray-50 rounded-xl p-4 transition-all duration-200 hover:shadow-sm"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-4">
                                <div className="w-32">
                                  <span className="font-medium text-gray-900 capitalize">
                                    {day}
                                  </span>
                                </div>
                                
                                <label className="relative inline-flex items-center cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={hours.isOpen}
                                    onChange={(e) => handleDayToggle(day, e.target.checked)}
                                    className="sr-only peer"
                                  />
                                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                                </label>
                              </div>

                              <div className="flex items-center space-x-4">
                                {hours.isOpen ? (
                                  <div className="flex items-center space-x-2">
                                    <input
                                      type="time"
                                      value={hours.start}
                                      onChange={(e) => handleTimeChange(day, 'start', e.target.value)}
                                      className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                    <span className="text-gray-500">to</span>
                                    <input
                                      type="time"
                                      value={hours.end}
                                      onChange={(e) => handleTimeChange(day, 'end', e.target.value)}
                                      className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                  </div>
                                ) : (
                                  <span className="text-gray-500 italic">Closed</span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Help Box */}
                      <div className="mt-6 bg-gradient-to-r from-blue-50 to-orange-50 rounded-xl p-4">
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <p className="text-sm text-blue-700">
                            These hours will be displayed to your patients. You can update them anytime in settings.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 3 - Services */}
                {currentStep === 3 && (
                  <div className="bg-white rounded-xl shadow-sm p-8">
                    <div className="mb-8">
                      <h2 className="text-2xl font-bold text-gray-900">Services & Doctors</h2>
                      <p className="mt-2 text-gray-600">Add your practice specialties and doctors</p>
                    </div>

                    <div className="space-y-8">
                      {/* Practice Specialties */}
                      <div className="space-y-4">
                        <label className="block text-sm font-medium text-gray-700">
                          Practice Specialties
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                          {specialtyOptions.map(specialty => (
                            <label
                              key={specialty}
                              className={`relative flex items-center p-4 cursor-pointer rounded-xl border ${
                                practiceData.specialties.includes(specialty)
                                  ? 'border-blue-500 bg-blue-50'
                                  : 'border-gray-200 hover:border-blue-200'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={practiceData.specialties.includes(specialty)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setPracticeData(prev => ({
                                      ...prev,
                                      specialties: [...prev.specialties, specialty]
                                    }));
                                  } else {
                                    setPracticeData(prev => ({
                                      ...prev,
                                      specialties: prev.specialties.filter(s => s !== specialty)
                                    }));
                                  }
                                }}
                                className="sr-only"
                              />
                              <span className="text-sm text-gray-900">{specialty}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Doctors Section */}
                      <div className="space-y-6">
                        <div className="flex justify-between items-center">
                          <h3 className="text-lg font-medium text-gray-900">Doctors</h3>
                          <span className="text-sm text-gray-500">
                            {practiceData.doctors.length} {practiceData.doctors.length === 1 ? 'doctor' : 'doctors'} added
                          </span>
                        </div>

                        {/* Doctors List */}
                        <div className="space-y-4">
                          {practiceData.doctors.map((doctor, index) => (
                            <div key={index} className="bg-gray-50 rounded-xl p-6 space-y-4">
                              <div className="flex justify-between items-start">
                                <div className="flex-1 grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Doctor Name
                                    </label>
                                    <input
                                      type="text"
                                      value={doctor.name}
                                      onChange={(e) => {
                                        const updatedDoctors = [...practiceData.doctors];
                                        updatedDoctors[index] = {
                                          ...doctor,
                                          name: e.target.value
                                        };
                                        setPracticeData(prev => ({
                                          ...prev,
                                          doctors: updatedDoctors
                                        }));
                                      }}
                                      className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                      placeholder="Enter doctor's name"
                                      required
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Specialization
                                    </label>
                                    <select
                                      value={doctor.specialization}
                                      onChange={(e) => {
                                        const updatedDoctors = [...practiceData.doctors];
                                        updatedDoctors[index] = {
                                          ...doctor,
                                          specialization: e.target.value
                                        };
                                        setPracticeData(prev => ({
                                          ...prev,
                                          doctors: updatedDoctors
                                        }));
                                      }}
                                      className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                      required
                                    >
                                      <option value="">Select Specialization</option>
                                      {specialtyOptions.map(specialty => (
                                        <option key={specialty} value={specialty}>
                                          {specialty}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeDoctor(index)}
                                  className="ml-4 text-gray-400 hover:text-red-500 transition-colors"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Add Doctor Button */}
                        <button
                          type="button"
                          onClick={addDoctor}
                          className="w-full py-3 px-4 border-2 border-dashed border-gray-300 rounded-xl text-sm font-medium text-gray-600 hover:border-blue-500 hover:text-blue-500 transition-colors flex items-center justify-center"
                        >
                          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          Add Doctor
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 4 - Rewards */}
                {currentStep === 4 && (
                  <div className="bg-white rounded-xl shadow-sm p-8">
                    <div className="mb-8">
                      <h2 className="text-2xl font-bold text-gray-900">Rewards Program</h2>
                      <p className="mt-2 text-gray-600">Configure your patient loyalty program</p>
                    </div>

                    <div className="space-y-8">
                      {/* Reward Campaigns */}
                      <div className="space-y-4">
                        <label className="block text-lg font-medium text-gray-900">
                          Select Reward Campaigns
                        </label>
                        <div className="grid grid-cols-2 gap-4">
                          {rewardCampaignOptions.map(campaign => (
                            <label
                              key={campaign}
                              className={`relative flex flex-col p-4 cursor-pointer rounded-xl border transition-all ${
                                practiceData.selectedRewardCampaigns.includes(campaign)
                                  ? 'border-blue-500 bg-blue-50'
                                  : 'border-gray-200 hover:border-blue-200'
                              }`}
                            >
                              <div className="flex items-start space-x-3">
                                <input
                                  type="checkbox"
                                  checked={practiceData.selectedRewardCampaigns.includes(campaign)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setPracticeData(prev => ({
                                        ...prev,
                                        selectedRewardCampaigns: [...prev.selectedRewardCampaigns, campaign]
                                      }));
                                    } else {
                                      setPracticeData(prev => ({
                                        ...prev,
                                        selectedRewardCampaigns: prev.selectedRewardCampaigns.filter(c => c !== campaign)
                                      }));
                                    }
                                  }}
                                  className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                />
                                <div>
                                  <span className="text-sm font-medium text-gray-900">{campaign}</span>
                                  <p className="mt-1 text-xs text-gray-500">
                                    {getRewardDescription(campaign)}
                                  </p>
                                </div>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Points Configuration */}
                      <div className="space-y-6 bg-gray-50 rounded-xl p-6">
                        <div>
                          <h3 className="text-lg font-medium text-gray-900 mb-4">Points System</h3>
                          <div className="grid grid-cols-3 gap-6">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Points per Visit
                              </label>
                              <div className="relative rounded-lg">
                                <input
                                  type="number"
                                  value={practiceData.pointsRules.perVisit}
                                  onChange={(e) => setPracticeData(prev => ({
                                    ...prev,
                                    pointsRules: {
                                      ...prev.pointsRules,
                                      perVisit: parseInt(e.target.value)
                                    }
                                  }))}
                                  className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  min="0"
                                />
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                  <span className="text-gray-500 text-sm">pts</span>
                                </div>
                              </div>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Points per Referral
                              </label>
                              <div className="relative rounded-lg">
                                <input
                                  type="number"
                                  value={practiceData.pointsRules.perReferral}
                                  onChange={(e) => setPracticeData(prev => ({
                                    ...prev,
                                    pointsRules: {
                                      ...prev.pointsRules,
                                      perReferral: parseInt(e.target.value)
                                    }
                                  }))}
                                  className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  min="0"
                                />
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                  <span className="text-gray-500 text-sm">pts</span>
                                </div>
                              </div>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Points per Review
                              </label>
                              <div className="relative rounded-lg">
                                <input
                                  type="number"
                                  value={practiceData.pointsRules.perReview}
                                  onChange={(e) => setPracticeData(prev => ({
                                    ...prev,
                                    pointsRules: {
                                      ...prev.pointsRules,
                                      perReview: parseInt(e.target.value)
                                    }
                                  }))}
                                  className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  min="0"
                                />
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                  <span className="text-gray-500 text-sm">pts</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Info Box */}
                      <div className="bg-gradient-to-r from-blue-50 to-orange-50 rounded-xl p-4">
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <p className="text-sm text-blue-700">
                            Your rewards program will help build patient loyalty. You can adjust these settings anytime in your practice dashboard.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Form Actions */}
                <div className="mt-6 flex justify-between pt-6 border-t border-gray-100">
                  {currentStep > 1 && (
                    <button
                      type="button"
                      onClick={() => setCurrentStep(prev => prev - 1)}
                      className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors"
                    >
                      Back
                    </button>
                  )}
                  <button
                    type="submit"
                    className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
                  >
                    {currentStep === 4 ? 'Complete Setup' : 'Continue'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;