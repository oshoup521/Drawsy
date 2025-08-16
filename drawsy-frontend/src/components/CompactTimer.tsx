import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';

interface CompactTimerProps {
  duration: number; // in seconds
  isActive: boolean;
  onTimeUp: () => void;
  onTick?: (remainingTime: number) => void;
  className?: string;
}

const CompactTimer: React.FC<CompactTimerProps> = ({
  duration,
  isActive,
  onTimeUp,
  onTick,
  className = '',
}) => {
  const [timeLeft, setTimeLeft] = useState(duration);
  const [isRunning, setIsRunning] = useState(false);

  // Reset timer when duration changes or when activated
  useEffect(() => {
    setTimeLeft(duration);
    setIsRunning(isActive);
  }, [duration, isActive]);

  // Timer logic
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prevTime) => {
          const newTime = prevTime - 1;
          onTick?.(newTime);
          
          if (newTime <= 0) {
            setIsRunning(false);
            onTimeUp();
            return 0;
          }
          
          return newTime;
        });
      }, 1000);
    } else if (!isRunning) {
      if (interval) clearInterval(interval);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, timeLeft, onTimeUp, onTick]);

  const formatTime = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const getTimerColor = useCallback(() => {
    const percentage = (timeLeft / duration) * 100;
    if (percentage > 50) return 'text-green-300 bg-green-500/20';
    if (percentage > 25) return 'text-yellow-300 bg-yellow-500/20';
    return 'text-red-300 bg-red-500/20';
  }, [timeLeft, duration]);

  const progressPercentage = (timeLeft / duration) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`flex items-center gap-2 px-3 py-1 rounded-full ${getTimerColor()} ${className}`}
    >
      {/* Mini Progress Circle */}
      <div className="relative w-5 h-5">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 20 20">
          <circle
            cx="10"
            cy="10"
            r="8"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
            className="opacity-30"
          />
          <motion.circle
            cx="10"
            cy="10"
            r="8"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 8}`}
            strokeDashoffset={`${2 * Math.PI * 8 * (1 - progressPercentage / 100)}`}
            className="transition-all duration-1000 ease-linear"
          />
        </svg>
      </div>

      {/* Timer Text */}
      <span className="text-sm font-semibold">
        ⏱️ {formatTime(timeLeft)}
      </span>

      {/* Warning indicator for last 10 seconds */}
      {timeLeft <= 10 && timeLeft > 0 && (
        <motion.span
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 0.5, repeat: Infinity }}
          className="text-xs font-bold"
        >
          !
        </motion.span>
      )}
    </motion.div>
  );
};

export default CompactTimer;