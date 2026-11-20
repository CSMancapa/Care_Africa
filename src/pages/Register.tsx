import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabase';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { PasswordInput } from '@/components/auth/PasswordInput';

const Register = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    practiceName: '',
    email: '',
    password: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      // 1. Sign up with Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            practice_name: formData.practiceName,
          },
          emailRedirectTo: `${window.location.origin}`
        }
      });

      if (error) throw error;
      if (!data.user) throw new Error('Failed to create user account');

      // Store registration data in localStorage to be used after email verification
      localStorage.setItem('pendingPracticeData', JSON.stringify({
        id: data.user.id,
        name: formData.practiceName,
        email: formData.email
      }));

      toast.success('Please check your email to verify your account');
      navigate('/verify-email', { 
        state: { email: formData.email },
        replace: true 
      });

    } catch (error: any) {
      console.error('Registration error:', error);
      toast.error(error.message || 'Failed to register');
      await supabase.auth.signOut();
    } finally {
      setLoading(false);
    }
  };

  const longEnough = formData.password.length >= 8;

  return (
    <AuthLayout
      title="Register your practice"
      subtitle="Set up your practice in a few minutes. You can add your logo, colours, services and team next."
      footer={
        <>
          Already registered?{' '}
          <Link to="/login" className="font-semibold text-primary hover:underline underline-offset-4">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="practiceName">Practice name</Label>
          <Input
            id="practiceName"
            type="text"
            required
            autoComplete="organization"
            placeholder="e.g. Seaview Dental Studio"
            value={formData.practiceName}
            onChange={(e) => setFormData(prev => ({ ...prev, practiceName: e.target.value }))}
            className="h-11"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Work email</Label>
          <Input
            id="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@yourpractice.co.za"
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            className="h-11"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <PasswordInput
            id="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={formData.password}
            onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
          />
          <p className={`flex items-center gap-1.5 text-xs transition-colors ${longEnough ? 'text-emerald-600' : 'text-muted-foreground'}`}>
            <Check className={`h-3.5 w-3.5 ${longEnough ? 'opacity-100' : 'opacity-40'}`} />
            At least 8 characters
          </p>
        </div>

        <Button type="submit" disabled={loading} className="h-11 w-full text-[15px]">
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Creating your account…
            </>
          ) : (
            <>
              Create account <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>

        <p className="text-center text-xs leading-relaxed text-muted-foreground">
          We'll email you a link to confirm your address before you continue.
        </p>
      </form>
    </AuthLayout>
  );
};

export default Register;
