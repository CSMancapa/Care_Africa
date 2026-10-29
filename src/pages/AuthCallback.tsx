import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabase';
import { toast } from 'sonner';

const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleEmailConfirmation = async () => {
      try {
        // Get the session to check if the email was confirmed
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) throw error;

        if (session?.user?.email_confirmed_at) {
          // Email is confirmed, redirect to verify-email to complete setup
          navigate('/verify-email', {
            state: { email: session.user.email },
            replace: true
          });
        } else {
          // If no session or email not confirmed, go back to register
          navigate('/register', { replace: true });
        }
      } catch (error) {
        console.error('Auth callback error:', error);
        toast.error('Authentication failed. Please try again.');
        navigate('/register', { replace: true });
      }
    };

    handleEmailConfirmation();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-4 text-gray-600">Confirming your email...</p>
      </div>
    </div>
  );
};

export default AuthCallback; 