import React, { useState, useEffect } from 'react';
import { Clock, Building2, Mail, Phone, Shield, Bell } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { getAuth } from 'firebase/auth';
import { useTheme } from '../contexts/ThemeContext';

interface PracticeSettings {
  practiceName: string;
  email: string;
  phone: string;
  address: string;
  businessHours: {
    [key: string]: {
      start: string;
      end: string;
      isOpen: boolean;
    };
  };
  appointmentDuration: number;
  notifications: {
    email: boolean;
    sms: boolean;
    reminders: boolean;
  };
}

const Settings = () => {
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('general');
  const [isLoading, setIsLoading] = useState(true);
  const [settings, setSettings] = useState<PracticeSettings>({
    practiceName: '',
    email: '',
    phone: '',
    address: '',
    businessHours: {
      monday: { start: '09:00', end: '17:00', isOpen: true },
      tuesday: { start: '09:00', end: '17:00', isOpen: true },
      wednesday: { start: '09:00', end: '17:00', isOpen: true },
      thursday: { start: '09:00', end: '17:00', isOpen: true },
      friday: { start: '09:00', end: '17:00', isOpen: true },
      saturday: { start: '09:00', end: '13:00', isOpen: false },
      sunday: { start: '09:00', end: '13:00', isOpen: false },
    },
    appointmentDuration: 30,
    notifications: {
      email: true,
      sms: true,
      reminders: true,
    },
  });

  // Fetch settings on component mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const auth = getAuth();
        const user = auth.currentUser;
        if (!user) return;

        const idTokenResult = await user.getIdTokenResult();
        const practiceId = idTokenResult.claims.practiceId;

        const response = await fetch(`/api/settings/${practiceId}`);
        if (!response.ok) throw new Error('Failed to fetch settings');
        
        const data = await response.json();
        setSettings(data);
      } catch (error) {
        console.error('Error fetching settings:', error);
        toast.error('Failed to load settings');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleSave = async () => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      const idTokenResult = await user.getIdTokenResult();
      const practiceId = idTokenResult.claims.practiceId;

      const response = await fetch(`/api/settings/${practiceId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      if (!response.ok) throw new Error('Failed to update settings');
      toast.success('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>;
  }

  return (
    <div className={`max-w-6xl mx-auto p-4 min-h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'}`}>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Practice Settings</h1>
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:bg-blue-800 dark:hover:bg-blue-900 transition-colors"
        >
          Save Changes
        </button>
      </div>

      <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8">
          {[
            { id: 'general', label: 'General', icon: Building2 },
            { id: 'hours', label: 'Business Hours', icon: Clock },
            { id: 'notifications', label: 'Notifications', icon: Bell },
            { id: 'security', label: 'Security', icon: Shield },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 pb-4 px-1 ${
                activeTab === tab.id
                  ? 'border-b-2 border-blue-500 dark:border-blue-400 text-blue-600 dark:text-blue-400'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <tab.icon className="h-5 w-5" />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      <div className="px-4 pb-4">
        {activeTab === 'general' && (
          <div className={`p-6 rounded-xl border ${
            theme === 'dark' 
              ? 'bg-gray-800 border-gray-700' 
              : 'bg-white border-gray-200'
          }`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Practice Name
                </label>
                <input
                  type="text"
                  value={settings.practiceName}
                  onChange={(e) => setSettings({ ...settings, practiceName: e.target.value })}
                  className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    theme === 'dark' 
                      ? 'bg-gray-700 border-gray-600 text-gray-100' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Email Address
                </label>
                <input
                  type="email"
                  value={settings.email}
                  onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                  className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    theme === 'dark' 
                      ? 'bg-gray-700 border-gray-600 text-gray-100' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={settings.phone}
                  onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                  className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    theme === 'dark' 
                      ? 'bg-gray-700 border-gray-600 text-gray-100' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Address
                </label>
                <input
                  type="text"
                  value={settings.address}
                  onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                  className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    theme === 'dark' 
                      ? 'bg-gray-700 border-gray-600 text-gray-100' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Appointment Duration (minutes)
                </label>
                <input
                  type="number"
                  value={settings.appointmentDuration}
                  onChange={(e) => setSettings({
                    ...settings,
                    appointmentDuration: parseInt(e.target.value),
                  })}
                  className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    theme === 'dark' 
                      ? 'bg-gray-700 border-gray-600 text-gray-100' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>
            </div>

            <div className="md:col-span-2 pt-6">
              <div className={`flex items-center justify-between p-4 rounded-lg border ${
                theme === 'dark' 
                  ? 'bg-gray-700 border-gray-600' 
                  : 'bg-white border-gray-200'
              }`}>
                <span className={theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}>
                  Dark Mode
                </span>
                <button
                  onClick={toggleTheme}
                  className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ${
                    theme === 'dark' ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${
                    theme === 'dark' ? 'translate-x-6' : 'translate-x-0'
                  }`} />
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'hours' && (
          <div className={`p-6 rounded-xl border ${
            theme === 'dark' 
              ? 'bg-gray-800 border-gray-700' 
              : 'bg-white border-gray-200'
          }`}>
            <div className="space-y-4">
              {Object.entries(settings.businessHours).map(([day, hours]) => (
                <div key={day} className={`flex items-center space-x-4 p-3 rounded-lg ${
                  theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                }`}>
                  <div className="w-32">
                    <span className={`capitalize ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      {day}
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    className={`mr-2 ${theme === 'dark' ? 'accent-blue-500' : 'accent-blue-600'}`}
                  />
                  <span className={`w-20 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Open
                  </span>
                  <input
                    type="time"
                    className={`p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      theme === 'dark' 
                        ? 'bg-gray-700 border-gray-600 text-gray-100' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                  <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>to</span>
                  <input
                    type="time"
                    className={`p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      theme === 'dark' 
                        ? 'bg-gray-700 border-gray-600 text-gray-100' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className={`p-6 rounded-xl border ${
            theme === 'dark' 
              ? 'bg-gray-800 border-gray-700' 
              : 'bg-white border-gray-200'
          }`}>
            <div className="space-y-4">
              <div className={`flex items-center justify-between p-4 rounded-lg ${
                theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
              }`}>
                <div>
                  <h3 className={`font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
                    Email Notifications
                  </h3>
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    Receive notifications via email
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className={`sr-only peer ${theme === 'dark' ? 'accent-blue-500' : 'accent-blue-600'}`}
                  />
                  <div className={`w-11 h-6 rounded-full peer ${
                    theme === 'dark' 
                      ? 'bg-gray-600 peer-checked:bg-blue-600' 
                      : 'bg-gray-200 peer-checked:bg-blue-600'
                  }`}></div>
                </label>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings; 