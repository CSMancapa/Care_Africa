import React, { ReactNode } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

interface BlurredHeaderProps {
  leftContent?: ReactNode;
  rightContent?: ReactNode;
  title?: string;
  className?: string;
}

const BlurredHeader: React.FC<BlurredHeaderProps> = ({
  leftContent,
  rightContent,
  title,
  className = ''
}) => {
  const { theme } = useTheme();

  return (
    <header className={`
      sticky top-0 z-50
      backdrop-blur-md
      border-b
      transition-all duration-300
      rounded-full mx-4 my-4
      shadow-lg
      ${theme === 'dark' 
        ? 'bg-gray-800/30 border-gray-700/50 shadow-xl' 
        : 'bg-gray-50/30 border-gray-100/20'}
      ${className}
    `}>
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex justify-between items-center h-14">
          {/* Left section */}
          <div className="flex items-center">
            {leftContent}
            {title && (
              <h1 className={`
                ml-4 text-xl font-semibold 
                ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}
              `}>
                {title}
              </h1>
            )}
          </div>

          {/* Right section */}
          <div className={`flex items-center ${
            theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
          }`}>
            {rightContent}
          </div>
        </div>
      </div>
    </header>
  );
};

export default BlurredHeader; 