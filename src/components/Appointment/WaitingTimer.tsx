import React, { useState, useEffect } from 'react';
import { Timer } from 'lucide-react';

interface WaitingTimerProps {
  status: string;
  wait_start_time?: string;
  onElapsedTimeChange?: (time: string) => void;
}

export const WaitingTimer: React.FC<WaitingTimerProps> = ({ 
  status, 
  wait_start_time,
  onElapsedTimeChange 
}) => {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (status === 'waiting' && wait_start_time) {
      const calculateElapsed = () => {
        const startTime = new Date(wait_start_time);
        const now = new Date();
        const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000);
        return elapsed;
      };

      const updateElapsed = () => {
        const elapsed = calculateElapsed();
        setElapsedSeconds(elapsed);
        
        // Format as MM:SS
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        if (onElapsedTimeChange) {
          onElapsedTimeChange(timeString);
        }
      };

      updateElapsed();

      const timer = setInterval(updateElapsed, 1000);

      return () => clearInterval(timer);
    }
  }, [status, wait_start_time, onElapsedTimeChange]);

  // Format as MM:SS
  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;
  const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  return status === 'waiting' ? (
    <div className="flex items-center gap-1 text-sm text-muted-foreground">
      <Timer className="w-4 h-4" />
      <span>{timeString}</span>
    </div>
  ) : null;
};

