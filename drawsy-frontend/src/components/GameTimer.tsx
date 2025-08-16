import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';

interface GameTimerProps {
  duration: number; // in seconds
  isActive: boolean;
  onTimeUp: () => void;
  onTick?: (remainingTime: number) => void;
  className?: string;
}

const GameTimer: React.FC<GameTimerProps> = ({
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
    if (percentage > 50) return 'text-green-400';
    if (percentage > 25) return 'text-yellow-400';
    return 'text-red-400';
  }, [timeLeft, duration]);

  const getProgressColor = useCallback(() => {
    const percentage = (timeLeft / duration) * 100;
    if (percentage > 50) return 'from-green-500 to-emerald-500';
    if (percentage > 25) return 'from-yellow-500 to-orange-500';
    return 'from-red-500 to-pink-500';
  }, [timeLeft, duration]);

  const progressPercentage = (timeLeft / duration) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`relative ${className}`}
    >
      {/* Circular Progress */}
      <div className="relative w-20 h-20">
        {/* Background Circle */}
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="45"
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            className="text-white/10"
          />
          {/* Progress Circle */}
          <motion.circle
            cx="50"
            cy="50"
            r="45"
            stroke="url(#gradient)"
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 45}`}
            strokeDashoffset={`${2 * Math.PI * 45 * (1 - progressPercentage / 100)}`}
            className="transition-all duration-1000 ease-linear"
          />
          {/* Gradient Definition */}
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={progressPercentage > 50 ? '#10b981' : progressPercentage > 25 ? '#f59e0b' : '#ef4444'} />
              <stop offset="100%" stopColor={progressPercentage > 50 ? '#059669' : progressPercentage > 25 ? '#d97706' : '#dc2626'} />
            </linearGradient>
          </defs>
        </svg>

        {/* Timer Text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className={`text-lg font-bold ${getTimerColor()}`}>
              {formatTime(timeLeft)}
            </div>
            {timeLeft <= 10 && timeLeft > 0 && (
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 0.5, repeat: Infinity }}
                className="text-xs text-red-400 font-semibold"
              >
                HURRY!
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Warning Animation for Last 10 Seconds */}
      {timeLeft <= 10 && timeLeft > 0 && (
        <motion.div
          animate={{ 
            boxShadow: [
              '0 0 0 0 rgba(239, 68, 68, 0.4)',
              '0 0 0 10px rgba(239, 68, 68, 0)',
              '0 0 0 0 rgba(239, 68, 68, 0)'
            ]
          }}
          transition={{ duration: 1, repeat: Infinity }}
          className="absolute inset-0 rounded-full"
        />
      )}

      {/* Time Up Animation */}
      {timeLeft === 0 && (
        <motion.div
          initial={{ scale: 1 }}
          animate={{ scale: [1, 1.3, 1] }}
          transition={{ duration: 0.5, repeat: 3 }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <div className="text-red-400 font-bold text-sm">
            TIME UP!
          </div>
        </motion.div>
      )}

      {/* Status Indicator */}
      <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
        <div className={`w-2 h-2 rounded-full ${
          isRunning ? 'bg-green-400 animate-pulse' : 'bg-gray-400'
        }`} />
      </div>
    </motion.div>
  );
};

export default GameTimer;