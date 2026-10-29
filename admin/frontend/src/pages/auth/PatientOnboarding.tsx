import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import logoIcon from '../../assets/img/Logo.png';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';

interface OnboardingQuestion {
  id: string;
  question: string;
  type: 'text' | 'date' | 'select' | 'radio' | 'checkbox' | 'email' | 'tel' | 'number' | 'password';
  options?: string[];
  required: boolean;
  section: string;
  placeholder?: string;
}

const questions: OnboardingQuestion[] = [
  // Section 0: Account Setup
  {
    id: 'firstName',
    question: 'What is your first name?',
    type: 'text',
    required: true,
    section: 'Account Setup',
    placeholder: 'First name'
  },
  {
    id: 'lastName',
    question: 'What is your last name?',
    type: 'text',
    required: true,
    section: 'Account Setup',
    placeholder: 'Last name'
  },
  {
    id: 'email',
    question: 'What is your email address?',
    type: 'email',
    required: true,
    section: 'Account Setup',
    placeholder: 'email@example.com'
  },
  {
    id: 'password',
    question: 'Create a password',
    type: 'password',
    required: true,
    section: 'Account Setup',
    placeholder: 'Enter your password'
  },
  // Section 1: Personal Information
  {
    id: 'dateOfBirth',
    question: 'What is your date of birth?',
    type: 'date',
    required: true,
    section: 'Personal Information'
  },
  {
    id: 'phone',
    question: 'What is your contact phone number?',
    type: 'tel',
    required: true,
    section: 'Personal Information',
    placeholder: '+27 64 123 4567'
  },
  {
    id: 'emergencyContact',
    question: 'Emergency contact number',
    type: 'tel',
    required: true,
    section: 'Personal Information',
    placeholder: '+27 64 123 4567'
  },
  // Section 2: Medical History
  {
    id: 'existingConditions',
    question: 'Do you have any existing medical conditions?',
    type: 'checkbox',
    options: ['Diabetes', 'Hypertension', 'Asthma', 'Heart Disease', 'None'],
    required: true,
    section: 'Medical History'
  },
  {
    id: 'medications',
    question: 'Are you currently taking any medications?',
    type: 'radio',
    options: ['Yes', 'No'],
    required: true,
    section: 'Medical History'
  },
  {
    id: 'allergies',
    question: 'Do you have any allergies?',
    type: 'checkbox',
    options: ['Penicillin', 'Latex', 'Pollen', 'None'],
    required: true,
    section: 'Medical History'
  },
  // Section 3: Preferences
  {
    id: 'communicationPreference',
    question: 'How would you like to receive notifications?',
    type: 'checkbox',
    options: ['Email', 'SMS', 'WhatsApp', 'In-App Notifications'],
    required: true,
    section: 'Preferences'
  },
  {
    id: 'appointmentReminders',
    question: 'How far in advance would you like appointment reminders?',
    type: 'select',
    options: ['1 day', '2 days', '3 days', '1 week'],
    required: true,
    section: 'Preferences'
  }
];

const sections = [
  'Account Setup',
  'Personal Information',
  'Medical History',
  'Preferences'
];

const PatientOnboarding = () => {
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    // ... other form fields
  });
  const navigate = useNavigate();

  const currentSection = sections[currentSectionIndex];
  const currentQuestions = questions.filter(q => q.section === currentSection);

  const handleNext = () => {
    // Save current section data
    const currentFormElement = document.querySelector('form') as HTMLFormElement;
    const currentFormData = new FormData(currentFormElement);
    const updatedData: Record<string, any> = {};
    currentFormData.forEach((value, key) => {
      updatedData[key] = value;
    });

    // Update formData with new values while preserving old ones
    setFormData(prev => ({
      ...prev,
      ...updatedData
    }));

    if (currentSectionIndex < sections.length - 1) {
      setCurrentSectionIndex(currentSectionIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentSectionIndex > 0) {
      setCurrentSectionIndex(currentSectionIndex - 1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error('Registration failed');
      }

      const data = await response.json();
      localStorage.setItem('token', data.token);
      navigate('/dashboard');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Registration failed');
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Logo icon in top left */}
      <div className="absolute top-8 left-8">
        <Link to="/">
          <img src={logoIcon} alt="Logo Icon" className="h-32 w-auto" />
        </Link>
      </div>

      <div className="max-w-3xl mx-auto px-6">
        {/* Progress Steps */}
        <div className="pt-24 pb-12">
          <div className="flex justify-between relative mb-4">
            {/* Connection Line */}
            <div className="absolute top-1/2 transform -translate-y-1/2 h-1 bg-gray-200 w-full -z-10" />
            
            {sections.map((section, index) => (
              <div key={section} className="flex flex-col items-center">
                <div 
                  className={`
                    w-8 h-8 rounded-full flex items-center justify-center 
                    ${index <= currentSectionIndex 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-white text-gray-400 border-2 border-gray-200'
                    }
                    transition-all duration-300
                  `}
                >
                  {index + 1}
                </div>
                <span 
                  className={`
                    mt-2 text-xs font-medium hidden sm:block
                    ${index <= currentSectionIndex ? 'text-blue-500' : 'text-gray-400'}
                  `}
                >
                  {section}
                </span>
              </div>
            ))}
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-1">
            <div
              className="bg-blue-500 h-1 rounded-full transition-all duration-500 ease-in-out"
              style={{
                width: `${((currentSectionIndex + 1) / sections.length) * 100}%`,
              }}
            />
          </div>
        </div>

        {/* Form Content */}
        <h1 className="text-3xl font-bold mb-6">{currentSection}</h1>
        
        {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          {currentQuestions.map(question => (
            <div key={question.id} className="mb-6">
              <label className="block text-gray-700 text-lg font-medium mb-3">{question.question}</label>
              
              {question.type === 'text' && (
                <input
                  name={question.id}
                  type="text"
                  placeholder={question.placeholder}
                  className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required={question.required}
                />
              )}

              {question.type === 'date' && (
                <input
                  name={question.id}
                  type="date"
                  className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required={question.required}
                />
              )}

              {question.type === 'select' && question.options && (
                <select 
                  name={question.id}
                  className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                  required={question.required}
                >
                  <option value="">Select an option</option>
                  {question.options.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              )}

              {question.type === 'checkbox' && question.options && (
                <div className="space-y-2">
                  {question.options.map(option => (
                    <label key={option} className="flex items-center space-x-3 text-gray-600">
                      <input 
                        type="checkbox" 
                        name={question.id} 
                        value={option} 
                        className="h-5 w-5 rounded border-gray-300 text-blue-500 focus:ring-blue-500" 
                      />
                      <span>{option}</span>
                    </label>
                  ))}
                </div>
              )}

              {question.type === 'radio' && question.options && (
                <div className="space-y-2">
                  {question.options.map(option => (
                    <label key={option} className="flex items-center space-x-3 text-gray-600">
                      <input 
                        type="radio" 
                        name={question.id} 
                        value={option} 
                        className="h-5 w-5 border-gray-300 text-blue-500 focus:ring-blue-500" 
                        required={question.required}
                      />
                      <span>{option}</span>
                    </label>
                  ))}
                </div>
              )}

              {question.type === 'tel' && (
                <div className="phone-input-container">
                  <PhoneInput
                    country={'za'}
                    value={formData[question.id] || ''}
                    onChange={(phone: string) => {
                      const formattedPhone = `+${phone}`;
                      setFormData(prev => ({
                        ...prev,
                        [question.id]: formattedPhone
                      }));
                    }}
                    inputProps={{
                      name: question.id,
                      required: question.required,
                    }}
                    containerClass="w-full"
                    inputClass="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    buttonClass="border border-gray-300 rounded-l-lg hover:bg-gray-50"
                    dropdownClass="bg-white border border-gray-300 rounded-lg shadow-lg"
                    searchClass="p-2 border-b border-gray-300"
                    enableSearch={true}
                    disableSearchIcon={false}
                    placeholder={question.placeholder}
                  />
                </div>
              )}

              {question.type === 'email' && (
                <input
                  name={question.id}
                  type="email"
                  value={formData[question.id] || ''}
                  onChange={(e) => setFormData(prev => ({...prev, [question.id]: e.target.value}))}
                  placeholder={question.placeholder}
                  className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required={question.required}
                />
              )}

              {question.type === 'password' && (
                <div className="relative">
                  <input
                    name={question.id}
                    type={showPassword ? 'text' : 'password'}
                    value={formData[question.id] || ''}
                    onChange={(e) => setFormData(prev => ({...prev, [question.id]: e.target.value}))}
                    placeholder={question.placeholder}
                    className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required={question.required}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5 text-gray-400" /> : <Eye className="h-5 w-5 text-gray-400" />}
                  </button>
                </div>
              )}
            </div>
          ))}

          <div className="flex justify-between mt-8">
            <button
              type="button"
              onClick={handlePrevious}
              disabled={currentSectionIndex === 0}
              className="px-4 py-2 bg-gray-300 text-white rounded disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
            >
              {currentSectionIndex === sections.length - 1 ? 'Submit' : 'Next'}
            </button>
          </div>
        </form>

        {/* Phone input styles */}
        <style>
          {`
            .phone-input-container .react-tel-input .form-control {
              width: 100% !important;
              padding: 0.75rem 1rem 0.75rem 3.5rem !important;
              border-radius: 0.5rem !important;
              border: 1px solid #e5e7eb !important;
              height: auto !important;
              font-size: 1rem !important;
            }

            .phone-input-container .react-tel-input .flag-dropdown {
              border: none !important;
              background: transparent !important;
            }

            .phone-input-container .react-tel-input .selected-flag {
              background: transparent !important;
              border-radius: 0.5rem 0 0 0.5rem !important;
              padding: 0 0 0 1rem !important;
            }

            .phone-input-container .react-tel-input .country-list {
              border-radius: 0.5rem !important;
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06) !important;
              border: 1px solid #e5e7eb !important;
              margin-top: 4px !important;
            }
          `}
        </style>
      </div>
    </div>
  );
};

export default PatientOnboarding;
