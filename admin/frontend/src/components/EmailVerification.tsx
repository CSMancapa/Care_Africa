import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

const EmailVerification = () => {
  const navigate = useNavigate();
  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [error, setError] = useState('');
  const email = sessionStorage.getItem('verificationEmail');

  useEffect(() => {
    // Focus first input on mount
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  const handleInput = (index: number, value: string) => {
    if (value.length > 1) {
      value = value[0];
    }

    const newCode = [...verificationCode];
    newCode[index] = value;
    setVerificationCode(newCode);

    // Move to next input if value is entered
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !verificationCode[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const code = verificationCode.join('');
    if (code.length !== 6) {
      setError('Please enter the complete verification code');
      return;
    }

    try {
      // Here you would verify the code with your backend
      // For now, we'll just simulate success
      navigate('/user/dashboard');
    } catch (error) {
      setError('Invalid verification code');
    }
  };

  const handleResend = () => {
    // Implement resend logic here
    console.log('Resending verification code');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-white px-4">
      <div className="max-w-md w-full space-y-8">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-600 hover:text-gray-800"
        >
          <ChevronLeft className="h-5 w-5" />
          <span>Back</span>
        </button>

        {/* Header */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">Almost there</h2>
          <p className="mt-2 text-sm text-gray-600">
            Please enter the 6-digit code sent to your email{' '}
            <span className="text-orange-600">{email}</span> for verification.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Verification Code Input */}
        <div className="flex justify-center space-x-4">
          {verificationCode.map((digit, index) => (
            <input
              key={index}
              ref={(el) => (inputRefs.current[index] = el)}
              type="text"
              maxLength={1}
              value={digit}
              onChange={(e) => handleInput(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              className="w-12 h-12 text-center text-xl font-semibold border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          ))}
        </div>

        {/* Verify Button */}
        <button
          onClick={handleVerify}
          className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
        >
          Verify
        </button>

        {/* Resend Code */}
        <div className="text-center">
          <p className="text-sm text-gray-600">
            Didn't receive any code?{' '}
            <button
              onClick={handleResend}
              className="font-medium text-orange-600 hover:text-orange-500"
            >
              Resend Again
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default EmailVerification;
