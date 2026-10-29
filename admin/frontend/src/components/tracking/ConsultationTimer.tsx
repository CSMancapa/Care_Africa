import React, { useState, useEffect } from 'react';
import { differenceInSeconds } from 'date-fns';
import { Play, Pause, Square } from 'react-feather';
import { useTheme } from '../../contexts/ThemeContext';

interface ConsultationTimerProps {
  startTime: Date;
  expectedDuration: number;
  onExtend: () => void;
}

const formatTime = (ms: number): string => {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
};

export function ConsultationTimer({ startTime, expectedDuration, onExtend }: ConsultationTimerProps) {
  const { theme } = useTheme();
  const [elapsed, setElapsed] = useState(0);
  const expectedMs = expectedDuration * 60 * 1000;
  const progress = Math.min((elapsed / expectedMs) * 100, 100);
  const isOvertime = elapsed > expectedMs;

  useEffect(() => {
    if (!startTime) return;
    const interval = setInterval(() => {
      setElapsed(Date.now() - startTime.getTime());
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  return (
    <div className={`mb-5 p-4 rounded-xl transition-colors duration-300 ${
      theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'
    }`}>
      <div className="flex justify-between items-center mb-3">
        <div className={`flex items-center gap-2 ${
          theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
        }`}>
          <Play size={14} className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} />
          <span className="text-sm font-medium">
            {Math.floor(elapsed / 60000)}m {Math.floor((elapsed % 60000) / 1000)}s
            {isOvertime && (
              <span className={`ml-2 ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>
                (overtime)
              </span>
            )}
          </span>
        </div>

        {isOvertime && onExtend && (
          <button
            onClick={onExtend}
            className={`relative overflow-hidden px-4 py-2 rounded-lg text-sm font-medium transition-all
              ${theme === 'dark' 
                ? 'bg-gray-700 hover:bg-gray-600 text-gray-100' 
                : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
          >
            <div
              className="absolute left-0 bottom-0 h-0.5 transition-all duration-1000"
              style={{
                width: `${(elapsed / expectedMs) * 100}%`,
                background: theme === 'dark' ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.5)'
              }}
            />
            <span className="flex items-center gap-2">
              <Play size={16} />
              {formatTime(elapsed)}
            </span>
          </button>
        )}
      </div>

      <div className={`w-full h-2 rounded-full overflow-hidden ${
        theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'
      }`}>
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{
            width: `${progress}%`,
            backgroundColor: isOvertime 
              ? (theme === 'dark' ? '#f87171' : '#ef4444') 
              : (theme === 'dark' ? '#60a5fa' : '#3b82f6')
          }}
        />
      </div>
    </div>
  );
} 