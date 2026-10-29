import React from 'react';
import { Calendar, Heart, Gift, ChevronRight, ChevronLeft, Clock, UserCheck } from 'lucide-react';
import { db } from '../../config/firebase';
import { collection, addDoc, doc, setDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { toast } from 'react-hot-toast';
import { campaignService } from '../../services/api';
import { useTheme } from '../../contexts/ThemeContext';

interface CampaignCreationProps {
  form: CampaignForm;
  setForm: (form: CampaignForm) => void;
  step: number;
  setStep: (step: number) => void;
  onSubmit: () => void;
  onClose: () => void;
}

interface CampaignForm {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  pointsStructure: {
    appointments: number;
    preventiveCare: number;
    annualCheckups: number;
    referrals: number;
  };
  healthGoals: string[];
  rewards: {
    points: number;
    type: 'service' | 'consultation' | 'checkup' | 'wellness';
    value: number;
    description: string;
  }[];
}

const CampaignCreation: React.FC<CampaignCreationProps> = ({
  form,
  setForm,
  step,
  setStep,
  onSubmit,
  onClose
}) => {
  const { theme } = useTheme();

  const healthGoalOptions = [
    'Regular Check-ups',
    'Preventive Screenings',
    'Medication Adherence',
    'Wellness Visits',
    'Health Education',
    'Vaccination Schedule'
  ];

  const updateForm = (updates: Partial<CampaignForm>) => {
    setForm({ ...form, ...updates });
  };

  const updatePointsStructure = (key: keyof CampaignForm['pointsStructure'], value: number) => {
    setForm({
      ...form,
      pointsStructure: {
        ...form.pointsStructure,
        [key]: value
      }
    });
  };

  const toggleHealthGoal = (goal: string) => {
    setForm({
      ...form,
      healthGoals: form.healthGoals.includes(goal)
        ? form.healthGoals.filter(g => g !== goal)
        : [...form.healthGoals, goal]
    });
  };

  const addReward = () => {
    setForm({
      ...form,
      rewards: [...form.rewards, { points: 0, type: 'service', value: 0, description: '' }]
    });
  };

  const updateReward = (index: number, updates: Partial<CampaignForm['rewards'][0]>) => {
    setForm({
      ...form,
      rewards: form.rewards.map((reward, i) => 
        i === index ? { ...reward, ...updates } : reward
      )
    });
  };

  const removeReward = (index: number) => {
    setForm({
      ...form,
      rewards: form.rewards.filter((_, i) => i !== index)
    });
  };

  const handleSubmit = async () => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) throw new Error('No user logged in');

      const campaignData = {
        ...form,
        uid: user.uid,
        createdAt: new Date().toISOString(),
        status: 'active'
      };

      await campaignService.createCampaign(campaignData);
      toast.success('Campaign created successfully');
      onClose();
    } catch (error) {
      console.error('Error creating campaign:', error);
      toast.error('Failed to create campaign');
    }
  };

  return (
    <div className={`p-8 max-w-4xl mx-auto min-h-screen transition-colors duration-300 ${
      theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'
    }`}>
      <div className="mb-8">
        <h2 className={`text-2xl font-bold ${
          theme === 'dark' ? 'text-white' : 'text-gray-800'
        }`}>
          Create Healthcare Loyalty Program
        </h2>
        
        <div className="mt-4 flex gap-4">
          {[1, 2, 3].map((number) => (
            <div key={number} className={`flex items-center ${number !== 3 ? 'flex-1' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors duration-300 ${
                step >= number 
                  ? 'bg-blue-600 text-white' 
                  : theme === 'dark' 
                    ? 'bg-gray-700 text-gray-300' 
                    : 'bg-gray-200 text-gray-600'
              }`}>
                {number}
              </div>
              {number !== 3 && (
                <div className={`h-1 flex-1 mx-2 transition-colors duration-300 ${
                  step > number 
                    ? 'bg-blue-600' 
                    : theme === 'dark' 
                      ? 'bg-gray-700' 
                      : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {step === 1 && (
        <div className="space-y-6">
          <div>
            <label className={`block text-sm font-medium mb-2 ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Program Name
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => updateForm({ name: e.target.value })}
              className={`w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-300 ${
                theme === 'dark'
                  ? 'bg-gray-800 border-gray-700 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
              placeholder="Wellness Rewards 2024"
            />
          </div>
          
          <div>
            <label className={`block text-sm font-medium mb-2 ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) => updateForm({ description: e.target.value })}
              className={`w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-300 ${
                theme === 'dark'
                  ? 'bg-gray-800 border-gray-700 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
              rows={4}
              placeholder="Describe your healthcare loyalty program..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Start Date
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => updateForm({ startDate: e.target.value })}
                  className={`w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    theme === 'dark'
                      ? 'bg-gray-800 border-gray-700 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
                <Calendar className={`w-5 h-5 absolute right-3 top-1/2 transform -translate-y-1/2 ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                }`} />
              </div>
            </div>
            
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                End Date
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => updateForm({ endDate: e.target.value })}
                  className={`w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    theme === 'dark'
                      ? 'bg-gray-800 border-gray-700 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
                <Calendar className={`w-5 h-5 absolute right-3 top-1/2 transform -translate-y-1/2 ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                }`} />
              </div>
            </div>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-4 ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Health Goals
            </label>
            <div className="grid grid-cols-2 gap-4">
              {healthGoalOptions.map((goal) => (
                <label
                  key={goal}
                  className={`flex items-center p-4 rounded-lg border cursor-pointer transition-all duration-300 ${
                    form.healthGoals.includes(goal)
                      ? 'border-blue-500 bg-blue-800/30'
                      : theme === 'dark'
                        ? 'border-gray-600 hover:bg-gray-800'
                        : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={form.healthGoals.includes(goal)}
                    onChange={() => toggleHealthGoal(goal)}
                    className="hidden"
                  />
                  <Heart className={`w-5 h-5 mr-3 ${
                    form.healthGoals.includes(goal) 
                      ? 'text-blue-500' 
                      : theme === 'dark' 
                        ? 'text-gray-400' 
                        : 'text-gray-500'
                  }`} />
                  <span className={`text-sm font-medium ${
                    theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
                  }`}>
                    {goal}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6">
          <h3 className={`text-lg font-medium ${
            theme === 'dark' ? 'text-gray-200' : 'text-gray-800'
          }`}>
            Points Structure
          </h3>
          
          <div className="grid gap-6">
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Regular Appointments
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={form.pointsStructure.appointments}
                  onChange={(e) => updatePointsStructure('appointments', Number(e.target.value))}
                  min="0"
                  className={`w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    theme === 'dark'
                      ? 'bg-gray-800 border-gray-700 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
                <Clock className={`w-5 h-5 absolute right-3 top-1/2 transform -translate-y-1/2 ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                }`} />
              </div>
              <p className={`mt-1 text-sm ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
              }`}>
                Points awarded for keeping scheduled appointments
              </p>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Preventive Care Visits
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={form.pointsStructure.preventiveCare}
                  onChange={(e) => updatePointsStructure('preventiveCare', Number(e.target.value))}
                  min="0"
                  className={`w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    theme === 'dark'
                      ? 'bg-gray-800 border-gray-700 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
                <Heart className={`w-5 h-5 absolute right-3 top-1/2 transform -translate-y-1/2 ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                }`} />
              </div>
              <p className={`mt-1 text-sm ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
              }`}>
                Points for preventive care and screenings
              </p>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Annual Check-ups
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={form.pointsStructure.annualCheckups}
                  onChange={(e) => updatePointsStructure('annualCheckups', Number(e.target.value))}
                  min="0"
                  className={`w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    theme === 'dark'
                      ? 'bg-gray-800 border-gray-700 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
                <UserCheck className={`w-5 h-5 absolute right-3 top-1/2 transform -translate-y-1/2 ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                }`} />
              </div>
              <p className={`mt-1 text-sm ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
              }`}>
                Points for completing annual health check-ups
              </p>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Patient Referrals
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={form.pointsStructure.referrals}
                  onChange={(e) => updatePointsStructure('referrals', Number(e.target.value))}
                  min="0"
                  className={`w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    theme === 'dark'
                      ? 'bg-gray-800 border-gray-700 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
                <UserCheck className={`w-5 h-5 absolute right-3 top-1/2 transform -translate-y-1/2 ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                }`} />
              </div>
              <p className={`mt-1 text-sm ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
              }`}>
                Points awarded for referring new patients
              </p>
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className={`text-lg font-medium ${
              theme === 'dark' ? 'text-gray-200' : 'text-gray-800'
            }`}>
              Healthcare Rewards
            </h3>
            <button
              onClick={addReward}
              className={`px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-300 flex items-center gap-2 ${
                theme === 'dark'
                  ? 'bg-blue-600 text-white'
                  : 'bg-blue-600 text-white'
              }`}
            >
              <Gift className="w-4 h-4" />
              Add Reward
            </button>
          </div>

          <div className="space-y-4">
            {form.rewards.map((reward, index) => (
              <div 
                key={index}
                className={`p-4 rounded-lg border transition-colors duration-300 ${
                  theme === 'dark
                    ? 'bg-gray-800 border-gray-700'
                    : 'bg-white border-gray-200'
                }`}
              >
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Points Required
                    </label>
                    <input
                      type="number"
                      value={reward.points}
                      onChange={(e) => updateReward(index, { points: Number(e.target.value) })}
                      className={`w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        theme === 'dark'
                          ? 'bg-gray-700 border-gray-600 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Reward Type
                    </label>
                    <select
                      value={reward.type}
                      onChange={(e) => updateReward(index, { type: e.target.value as any })}
                      className={`w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        theme === 'dark'
                          ? 'bg-gray-800 border-gray-700 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    >
                      <option value="service">Health Service</option>
                      <option value="consultation">Free Consultation</option>
                      <option value="checkup">Complimentary Check-up</option>
                      <option value="wellness">Wellness Program</option>
                    </select>
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Value ($)
                    </label>
                    <input
                      type="number"
                      value={reward.value}
                      onChange={(e) => updateReward(index, { value: Number(e.target.value) })}
                      className={`w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        theme === 'dark'
                          ? 'bg-gray-700 border-gray-600 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Description
                    </label>
                    <input
                      type="text"
                      value={reward.description}
                      onChange={(e) => updateReward(index, { description: e.target.value })}
                      className={`w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        theme === 'dark'
                          ? 'bg-gray-800 border-gray-700 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                      placeholder="e.g., Free annual wellness check"
                    />
                  </div>
                </div>
                
                <button
                  onClick={() => removeReward(index)}
                  className={`mt-4 text-sm px-3 py-1 rounded-md hover:bg-opacity-20 transition-colors ${
                    theme === 'dark'
                      ? 'text-red-400 hover:bg-red-400/20'
                      : 'text-red-600 hover:bg-red-100'
                  }`}
                >
                  Remove Reward
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={`mt-8 pt-6 border-t ${
        theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
      }`}>
        <div className="flex justify-between">
          {step > 1 && (
            <button
              onClick={() => setStep(step - 1)}
              className={`px-6 py-2 rounded-lg transition-colors duration-300 ${
                theme === 'dark'
                  ? 'text-gray-300 hover:bg-gray-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Previous
            </button>
          )}
          <button
            onClick={step === 3 ? handleSubmit : () => setStep(step + 1)}
            className={`px-6 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors duration-300 ml-auto ${
              theme === 'dark' ? 'shadow-lg shadow-blue-600/20' : ''
            }`}
          >
            {step === 3 ? 'Launch Program' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CampaignCreation;