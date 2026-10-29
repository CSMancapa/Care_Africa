import React, { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { LayoutDashboard, Target, Users, BarChart, Settings } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange }) => {
  const { theme } = useTheme();
  const [isHovered, setIsHovered] = useState<string | null>(null);

  const menuItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'campaigns', icon: Target, label: 'Campaigns' },
    { id: 'customers', icon: Users, label: 'Customers' },
    { id: 'analytics', icon: BarChart, label: 'Analytics' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <div className={`h-screen flex flex-col select-none w-64 border-r transition-colors duration-300 ${
      theme === 'dark' ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'
    }`}>
      {/* Logo Section */}
      <div className={`p-6 border-b transition-colors duration-300 ${
        theme === 'dark' ? 'border-gray-800' : 'border-gray-200'
      }`}>
        <h1 className={`text-xl font-bold truncate ${
          theme === 'dark' ? 'text-gray-200' : 'text-gray-800'
        }`}>
          Loyalty Admin
        </h1>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 py-6 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              onMouseEnter={() => setIsHovered(item.id)}
              onMouseLeave={() => setIsHovered(null)}
              className={`w-full flex items-center px-6 py-3 text-sm font-medium transition-all duration-300 ${
                isActive
                  ? 'text-blue-600 bg-blue-50 border-r-4 border-blue-600'
                  : theme === 'dark' 
                    ? 'text-gray-300 hover:bg-gray-800'
                    : 'text-gray-600 hover:bg-blue-50'
              } ${
                isHovered === item.id && !isActive ? (
                  theme === 'dark' ? 'bg-gray-800' : 'bg-blue-50'
                ) : ''
              }`}
            >
              <Icon className={`w-5 h-5 mr-3 flex-shrink-0 ${
                isActive 
                  ? 'text-blue-600' 
                  : theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`} />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* User Profile Section */}
      <div className={`p-6 border-t transition-colors duration-300 ${
        theme === 'dark' ? 'border-gray-800' : 'border-gray-200'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
            theme === 'dark' ? 'bg-blue-700' : 'bg-blue-600'
          }`}>
            <span className="text-white font-medium text-sm">A</span>
          </div>
          <div className="min-w-0">
            <p className={`text-sm font-medium truncate ${
              theme === 'dark' ? 'text-gray-200' : 'text-gray-800'
            }`}>
              Admin User
            </p>
            <p className={`text-xs truncate ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
            }`}>
              admin@company.com
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;