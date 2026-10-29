import React, { useEffect, useState } from 'react';
import Sidebar from './Sidebar';
import { Outlet } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import BlurredHeader from './BlurredHeader';
import supabase from '../../config/supabase';

const DashboardLayout = () => {
  const { theme } = useTheme();
  const [user, setUser] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  // Use auth state listener instead of direct getUser()
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        setUser(session.user);
        await fetchSettings();
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .single();

      if (error) throw error;
      setSettings(data);
    } catch (error) {
      console.error('Error fetching settings:', error);
      setSettings(null);
    }
  };

  if (loading) {
    return <div className="p-8">Loading dashboard...</div>;
  }

  return (
    <div className={`flex min-h-screen transition-colors duration-300 ${
      theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'
    }`}>
      <Sidebar />
      
      <div className="flex-1">
        
        
        <main className={`ml-72 p-8 transition-colors duration-300 ${
          theme === 'dark' ? 'text-gray-100' : 'text-gray-900'
        }`}>
          <div className={`rounded-xl shadow-sm p-6 transition-colors duration-300 ${
            theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          } border`}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout; 