import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { toast } from 'react-hot-toast';
import supabase from '../../config/supabase';

export const BASE_URL = 'http://localhost:5001';
const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = location.state?.returnTo || '/admin/dashboard';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message === 'Invalid login credentials' 
        ? 'Invalid email or password. Please try again.'
        : 'An error occurred. Please try again later.');
    }

    setLoading(false);
  };

  const handleSignUpClick = (e: React.MouseEvent) => {
    e.preventDefault();
    navigate('/onboarding', { 
      state: { returnTo: returnTo } 
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white">
      <div className="max-w-md w-full px-4 py-12">
        <h1 className="text-3xl font-semibold text-gray-900 mb-6">Login</h1>
        {error && (
          <div 
            role="alert"
            className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded"
          >
            {error}
          </div>
        )}
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(null);
              }}
              className="w-full p-2 rounded-lg border bg-white text-gray-900 border-gray-300"
              placeholder="Email"
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
                className="w-full p-2 rounded-lg border mt-4 bg-white text-gray-900 border-gray-300"
                placeholder="Password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className={`w-full bg-blue-500 text-white py-3 rounded-xl font-medium ${
              loading ? 'cursor-not-allowed' : 'hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors'
            }`}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600">
            Don't have an account?{' '}
            <button 
              onClick={handleSignUpClick}
              className="text-blue-500 hover:text-blue-600 font-medium"
            >
              Sign up
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login; 