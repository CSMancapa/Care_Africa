import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabase';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { MailCheck, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AuthLayout } from '@/components/auth/AuthLayout';

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

  return (
    <AuthLayout
      title="Check your email"
      subtitle={
        <>
          We sent a confirmation link to <span className="font-semibold text-ink">{email}</span>.
          Open it on this device to continue setting up your practice.
        </>
      }
      footer={
        <>
          Wrong address?{' '}
          <Link to="/register" className="font-semibold text-primary hover:underline underline-offset-4">
            Start again
          </Link>
        </>
      }
    >
      <div className="rounded-xl border border-border bg-card p-6 shadow-card">
        <div className="flex items-start gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <MailCheck className="h-5 w-5 text-primary" />
          </span>
          <div className="text-sm leading-relaxed text-muted-foreground">
            <p className="font-semibold text-ink">Waiting for confirmation…</p>
            <p className="mt-1">This page moves on by itself once you've clicked the link. It can take a minute to arrive, so check your spam folder too.</p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={handleResendEmail}
          disabled={countdown > 0}
          className="mt-6 h-11 w-full"
        >
          <RotateCw className="h-4 w-4" />
          {countdown > 0 ? `Resend email in ${countdown}s` : 'Resend confirmation email'}
        </Button>
      </div>
    </AuthLayout>
  );
};

export default VerifyEmail;
