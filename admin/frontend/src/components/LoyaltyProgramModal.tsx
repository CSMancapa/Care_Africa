import React from 'react';
import { LoyaltyProgram } from '../types/loyalty';

const InfoTooltip = ({ text }: { text: string }) => (
  <div className="group relative inline-block ml-1">
    <svg className="w-4 h-4 text-gray-500 hover:text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
    <div className="invisible group-hover:visible absolute z-50 w-48 p-2 mt-1 text-sm text-white bg-gray-900 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 -translate-x-1/2 left-1/2">
      {text}
    </div>
  </div>
);

interface LoyaltyProgramModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: LoyaltyProgram;
  setSettings: (settings: LoyaltyProgram) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const LoyaltyProgramModal = ({
  isOpen,
  onClose,
  settings,
  setSettings,
  onSubmit
}: LoyaltyProgramModalProps) => {
  const [currentStep, setCurrentStep] = React.useState(1);

  if (!isOpen) return null;

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div>
              <div className="flex items-center mb-1">
                <label className="block text-sm font-medium">Program Name</label>
                <InfoTooltip text="Choose a memorable name that reflects your loyalty program's purpose" />
              </div>
              <input
                type="text"
                value={settings.name}
                onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                className="w-full p-2 border rounded-lg"
              />
            </div>

            <div>
              <div className="flex items-center mb-1">
                <label className="block text-sm font-medium">Description</label>
                <InfoTooltip text="Provide a clear, concise explanation of your program's benefits" />
              </div>
              <textarea
                value={settings.description || ''}
                onChange={(e) => setSettings({ ...settings, description: e.target.value })}
                className="w-full p-2 border rounded-lg"
              />
            </div>

            <div>
              <div className="flex items-center mb-1">
                <label className="block text-sm font-medium">Start Date</label>
                <InfoTooltip text="When should this program become active?" />
              </div>
              <input
                type="date"
                value={settings.startDate ? settings.startDate.toISOString().split('T')[0] : ''}
                onChange={(e) => setSettings({ ...settings, startDate: new Date(e.target.value) })}
                className="w-full p-2 border rounded-lg"
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div>
              <div className="flex items-center mb-1">
                <label className="block text-sm font-medium">Points per Visit</label>
                <InfoTooltip text="Number of points awarded for each completed appointment" />
              </div>
              <input
                type="number"
                value={settings.pointsPerVisit}
                onChange={(e) => setSettings({ ...settings, pointsPerVisit: Number(e.target.value) })}
                className="w-full p-2 border rounded-lg"
              />
            </div>

            <div>
              <div className="flex items-center mb-1">
                <label className="block text-sm font-medium">Points per Referral</label>
                <InfoTooltip text="Number of points awarded for each successful referral" />
              </div>
              <input
                type="number"
                value={settings.pointsPerReferral}
                onChange={(e) => setSettings({ ...settings, pointsPerReferral: Number(e.target.value) })}
                className="w-full p-2 border rounded-lg"
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div>
              <div className="flex items-center mb-1">
                <label className="block text-sm font-medium">Reward Threshold</label>
                <InfoTooltip text="Number of points needed to redeem a reward" />
              </div>
              <input
                type="number"
                value={settings.rewardThreshold}
                onChange={(e) => setSettings({ ...settings, rewardThreshold: Number(e.target.value) })}
                className="w-full p-2 border rounded-lg"
              />
            </div>

            <div>
              <div className="flex items-center mb-1">
                <label className="block text-sm font-medium">Reward Value</label>
                <InfoTooltip text="Monetary value of the reward when redeemed" />
              </div>
              <input
                type="number"
                value={settings.rewardValue}
                onChange={(e) => setSettings({ ...settings, rewardValue: Number(e.target.value) })}
                className="w-full p-2 border rounded-lg"
              />
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <div>
              <div className="flex items-center mb-1">
                <label className="block text-sm font-medium">Points Expiration (Days)</label>
                <InfoTooltip text="Number of days before earned points expire" />
              </div>
              <input
                type="number"
                value={settings.pointsExpiration}
                onChange={(e) => setSettings({ ...settings, pointsExpiration: Number(e.target.value) })}
                className="w-full p-2 border rounded-lg"
              />
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            <div>
              <div className="flex items-center mb-1">
                <label className="block text-sm font-medium">Terms and Conditions</label>
                <InfoTooltip text="Specify the rules and conditions of your loyalty program" />
              </div>
              <textarea
                value={settings.terms || ''}
                onChange={(e) => setSettings({ ...settings, terms: e.target.value })}
                className="w-full p-2 border rounded-lg h-32"
              />
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-4">
            <div>
              <div className="flex items-center mb-1">
                <label className="block text-sm font-medium">Program Status</label>
                <InfoTooltip text="Set whether the program is active or draft" />
              </div>
              <select
                value={settings.status}
                onChange={(e) => setSettings({ ...settings, status: e.target.value as "active" | "inactive" })}
                className="w-full p-2 border rounded-lg"
              >
                <option value="inactive">Draft</option>
                <option value="active">Active</option>
              </select>
            </div>
          </div>
        );

      case 7:
        return (
          <div className="space-y-4">
            <h3 className="font-medium">Program Summary</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p><strong>Name:</strong> {settings.name}</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center overflow-y-auto">
      <div className="bg-white p-6 rounded-xl w-full max-w-2xl m-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Create Loyalty Program</h2>
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-600">Step {currentStep} of 7</div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
              aria-label="Close modal"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Step indicators */}
        <div className="flex mb-6">
          {[1, 2, 3, 4, 5, 6, 7].map((step) => (
            <div
              key={step}
              className={`flex-1 h-2 ${
                step <= currentStep ? 'bg-blue-600' : 'bg-gray-200'
              } ${step === 1 ? 'rounded-l' : step === 7 ? 'rounded-r' : ''}`}
            />
          ))}
        </div>

        <form onSubmit={onSubmit}>
          {renderStepContent()}

          {/* Navigation buttons */}
          <div className="flex gap-2 mt-6">
            {currentStep > 1 && (
              <button
                type="button"
                onClick={() => setCurrentStep(step => step - 1)}
                className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Previous
              </button>
            )}
            {currentStep < 7 ? (
              <button
                type="button"
                onClick={() => setCurrentStep(step => step + 1)}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Next
              </button>
            ) : (
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Create Program
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}; 