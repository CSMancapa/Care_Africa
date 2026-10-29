import React from 'react';
import { TrendingUp, Award, Users as UsersIcon, LucideIcon } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

interface StatsPanelProps {
  stats: {
    label: string;
    value: number;
    icon: LucideIcon;
    change?: number;
  }[];
}

const StatsPanel: React.FC<StatsPanelProps> = ({ stats }) => {
  const { theme } = useTheme();

  return (
    <div className={`p-6 rounded-lg transition-colors duration-300 ${
      theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'
    }`}>
      <h2 className={`text-lg font-semibold mb-6 transition-colors duration-300 ${
        theme === 'dark' ? 'text-white' : 'text-gray-800'
      }`}>
        Quick Stats
      </h2>
      <div className="grid grid-cols-3 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className={`rounded-lg p-4 shadow-sm transition-colors duration-300 ${
                theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-white hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <Icon className={`w-5 h-5 ${
                  theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                }`} />
                {stat.change && (
                  <span className={`text-sm ${
                    theme === 'dark' 
                      ? stat.change > 0 ? 'text-green-400' : 'text-red-400'
                      : stat.change > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {stat.change > 0 ? '+' : ''}{stat.change}%
                  </span>
                )}
              </div>
              <p className={`text-2xl font-bold transition-colors duration-300 ${
                theme === 'dark' ? 'text-white' : 'text-gray-800'
              }`}>
                {stat.value}
              </p>
              <p className={`text-sm transition-colors duration-300 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
              }`}>
                {stat.label}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default StatsPanel;
