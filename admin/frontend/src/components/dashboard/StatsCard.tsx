import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

const StatsCard: React.FC<StatsCardProps> = ({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  className 
}) => {
  const { theme } = useTheme();

  return (
    <div className={`rounded-xl p-6 shadow-sm transition-colors duration-300 ${
      theme === 'dark' 
        ? 'bg-gray-800 border border-gray-700' 
        : 'bg-white border border-gray-200'
    } ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-sm transition-colors duration-300 ${
            theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
          }`}>
            {title}
          </p>
          <h3 className={`text-2xl font-semibold mt-2 transition-colors duration-300 ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            {value}
          </h3>
          {trend && (
            <p className={`text-sm mt-2 flex items-center ${
              trend.isPositive 
                ? 'text-green-600 dark:text-green-400' 
                : 'text-red-600 dark:text-red-400'
            }`}>
              {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
            </p>
          )}
        </div>
        <div className={`p-3 rounded-lg transition-colors duration-300 ${
          theme === 'dark' ? 'bg-gray-700' : 'bg-blue-50'
        }`}>
          <Icon className={`w-6 h-6 transition-colors duration-300 ${
            theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
          }`} />
        </div>
      </div>
    </div>
  );
};

export default StatsCard;