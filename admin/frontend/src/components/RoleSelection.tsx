import React from 'react';
import { useNavigate } from 'react-router-dom';

const RoleSelection: React.FC = () => {
  const navigate = useNavigate();

  const handleSelection = (role: string) => {
    if (role === 'doctor') {
      navigate('/onboarding');
    } else if (role === 'patient') {
      navigate('/patient/auth');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
      <h1 className="text-2xl font-bold mb-6">Are you a doctor or a patient?</h1>
      <div className="space-x-4">
        <button
          onClick={() => handleSelection('doctor')}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
        >
          Doctor
        </button>
        <button
          onClick={() => handleSelection('patient')}
          className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600"
        >
          Patient
        </button>
      </div>
    </div>
  );
};

export default RoleSelection;
