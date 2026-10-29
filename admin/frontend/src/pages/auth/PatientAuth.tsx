import React from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '../../assets/img/Logo.png';


const PatientAuth = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-white px-4">
      <div className="max-w-md w-full space-y-8">
        {/* Logo and Heading */}
        <div className="text-center">
          <img src={logo} alt="Logo" className="h-16 w-auto mx-auto mb-6" />
          <h2 className="text-3xl font-bold text-gray-900">Welcome to Care Africa</h2>
          <p className="mt-2 text-sm text-gray-600">Your Intelligent AI Health Rewards Companion</p>
        </div>

        <div className="space-y-4">
          {/* Login Button */}
          <button
            onClick={() => navigate('/patient/login')}
            className="w-full flex justify-center py-3 px-4 border-2 border-orange-600 rounded-lg text-sm font-medium text-orange-600 hover:bg-orange-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors"
          >
            Login to Your Account
          </button>

          {/* Sign Up Button */}
          <button
            onClick={() => navigate('/patient/signup')}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors"
          >
            Create New Account
          </button>
        </div>

        {/* Back Button */}
        <div className="text-center">
          <button
            onClick={() => navigate('/role-select')}
            className="text-sm text-gray-600 hover:text-orange-600 transition-colors"
          >
            ← Back to Role Selection
          </button>
        </div>
      </div>
    </div>
  );
};

export default PatientAuth;
