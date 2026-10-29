import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabase';
import { toast } from 'sonner';

const VerifyEmail = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { email } = location.state || {};
  const [countdown, setCountdown] = useState(60);

  useEffect(() => {
    // If no email in state, try to get the current session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        // User is logged in, redirect to dashboard
        navigate('/', { replace: true });
        return;
      } else if (!email) {
        // No session and no email, redirect to register
        navigate('/register', { replace: true });
        return;
      }
    };

    checkSession();

    // Only set up verification checking if we have an email and no session
    if (email) {
      const checkEmailVerification = async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session?.user?.email_confirmed_at) {
            navigate('/', { replace: true });
            return;
          }
        } catch (error) {
          console.error('Session check error:', error);
        }
      };

      // Check immediately and then every 2 seconds
      checkEmailVerification();
      const interval = setInterval(checkEmailVerification, 2000);

      // Countdown for resend email button
      const countdownInterval = setInterval(() => {
        setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);

      return () => {
        clearInterval(interval);
        clearInterval(countdownInterval);
      };
    }
  }, [email, navigate]);

  const handleResendEmail = async () => {
    if (countdown > 0) return;
    
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}`
        }
      });

      if (error) throw error;
      
      toast.success('Verification email resent! Please check your inbox and spam folder');
      setCountdown(60);
    } catch (error: any) {
      console.error('Failed to resend:', error);
      toast.error(error.message || 'Failed to resend verification email');
    }
  };

  // If we're still on this page, show the verification UI
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">Check your email</h2>
            <p className="mt-2 text-sm text-gray-600">
              We sent a verification link to <span className="font-medium">{email}</span>
            </p>
          </div>

          <div className="mt-6">
            <button
              onClick={handleResendEmail}
              disabled={countdown > 0}
              className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                countdown > 0 ? 'bg-gray-400' : 'bg-primary hover:bg-primary/90'
              }`}
            >
              {countdown > 0 ? `Resend email in ${countdown}s` : 'Resend verification email'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail; 