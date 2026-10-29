import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

interface HeaderProps {
  onBack: () => void;
}

const Header: React.FC<HeaderProps> = ({ onBack }) => {
  const { theme } = useTheme();

  return (
    <header className={`border-b px-6 py-4 transition-colors duration-300 ${
      theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
    }`}>
      <div className="flex items-center">
        <button
          onClick={onBack}
          className={`mr-4 p-2 rounded-full transition-colors duration-300 ${
            theme === 'dark' 
              ? 'hover:bg-gray-700 text-gray-300' 
              : 'hover:bg-gray-100 text-gray-600'
          }`}
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className={`text-xl font-semibold transition-colors duration-300 ${
          theme === 'dark' ? 'text-white' : 'text-gray-900'
        }`}>
          Loyalty Program
        </h1>
      </div>
    </header>
  );
};

export default Header;