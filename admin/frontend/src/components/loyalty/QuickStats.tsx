import React from 'react';
import { TrendingUp, Award } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

const QuickStats: React.FC = () => {
  const { theme } = useTheme();
  const [topCustomers] = React.useState([
    { name: 'Sarah Johnson', points: 2450 },
    { name: 'Mike Chen', points: 1890 },
    { name: 'Emma Davis', points: 1670 },
  ]);

  return (
    <div className={`w-full flex flex-col gap-6 p-4 transition-colors duration-300 ${
      theme === 'dark' ? 'bg-gray-900' : 'bg-white'
    }`}>
      <section className={`rounded-lg p-6 transition-colors duration-300 ${
        theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'
      }`}>
        <h3 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${
          theme === 'dark' ? 'text-gray-200' : 'text-gray-800'
        }`}>
          <TrendingUp className={`w-4 h-4 ${
            theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
          }`} />
          Top Customers
        </h3>
        <div className="space-y-2">
          {topCustomers.map((customer, index) => (
            <div
              key={index}
              className={`rounded-lg p-2 shadow-sm flex items-center justify-between transition-colors duration-300 ${
                theme === 'dark' 
                  ? 'bg-gray-700 hover:bg-gray-600' 
                  : 'bg-white hover:bg-gray-50'
              }`}
            >
              <div>
                <p className={`font-medium text-sm ${
                  theme === 'dark' ? 'text-gray-100' : 'text-gray-800'
                }`}>
                  {customer.name}
                </p>
                <p className={`text-xs ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  {customer.points} points
                </p>
              </div>
              <Award className={`w-4 h-4 ${
                index === 0 
                  ? 'text-yellow-500' 
                  : theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
              }`} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default QuickStats;
