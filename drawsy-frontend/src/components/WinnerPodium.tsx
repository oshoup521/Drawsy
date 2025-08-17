import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Player } from '../types/game';

interface WinnerPodiumProps {
  isOpen: boolean;
  players: Player[];
  onClose: () => void;
  onReturnToLobby?: () => void;
}

const WinnerPodium: React.FC<WinnerPodiumProps> = ({ isOpen, players, onClose, onReturnToLobby }) => {
  // Sort players by score (highest first)
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
  
  // Get top 3 players (or fewer if less than 3 players)
  const topPlayers = sortedPlayers.slice(0, Math.min(3, sortedPlayers.length));
  
  // Determine podium positions based on number of players
  const showThirdPlace = topPlayers.length >= 3;
  const showSecondPlace = topPlayers.length >= 2;

  // Inject CSS styles dynamically
  useEffect(() => {
    if (!isOpen) return;

    const styleId = 'confetti-styles';
    const existingStyle = document.getElementById(styleId);
    
    if (existingStyle) {
      existingStyle.remove();
    }

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      @keyframes confetti-fall {
        0% {
          transform: translateY(-100vh) translateX(0) rotate(0deg) scale(0);
          opacity: 1;
        }
        10% {
          transform: translateY(-90vh) translateX(0) rotate(36deg) scale(1);
          opacity: 1;
        }
        20% {
          transform: translateY(-70vh) translateX(var(--random-x-1)) rotate(72deg) scale(1);
          opacity: 1;
        }
        50% {
          transform: translateY(-20vh) translateX(var(--random-x-2)) rotate(180deg) scale(0.8);
          opacity: 0.8;
        }
        80% {
          transform: translateY(20vh) translateX(var(--random-x-3)) rotate(300deg) scale(0.6);
          opacity: 0.6;
        }
        100% {
          transform: translateY(100vh) translateX(var(--random-x-4)) rotate(var(--rotation)) scale(0);
          opacity: 0;
        }
      }

      @keyframes burst {
        0% {
          transform: scale(0) rotate(0deg);
          opacity: 0;
        }
        50% {
          transform: scale(1.2) rotate(180deg);
          opacity: 1;
        }
        100% {
          transform: scale(0.8) rotate(360deg);
          opacity: 0.7;
        }
      }

      .confetti-piece {
        position: absolute;
        pointer-events: none;
        font-size: var(--size);
        animation: confetti-fall var(--duration) var(--delay) ease-in-out infinite;
        left: var(--start-x);
        top: 0;
        z-index: 1000;
      }

      .burst-effect {
        animation: burst 0.6s ease-out forwards;
        position: absolute;
        font-size: 2rem;
        pointer-events: none;
      }
    `;
    
    document.head.appendChild(style);

    return () => {
      const styleToRemove = document.getElementById(styleId);
      if (styleToRemove) {
        styleToRemove.remove();
      }
    };
  }, [isOpen]);

  const getPodiumHeight = (position: number) => {
    switch (position) {
      case 1: return 'h-20 sm:h-24 lg:h-32'; // 1st place - tallest
      case 2: return 'h-16 sm:h-20 lg:h-24'; // 2nd place - medium
      case 3: return 'h-12 sm:h-16 lg:h-16'; // 3rd place - shortest
      default: return 'h-12 sm:h-16 lg:h-16';
    }
  };

  const getPodiumColor = (position: number) => {
    switch (position) {
      case 1: return 'from-yellow-400 to-yellow-600'; // Gold
      case 2: return 'from-gray-300 to-gray-500'; // Silver
      case 3: return 'from-orange-400 to-orange-600'; // Bronze
      default: return 'from-gray-400 to-gray-600';
    }
  };

  const getPositionEmoji = (position: number) => {
    switch (position) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return '🏆';
    }
  };

  // Create confetti pieces with random properties
  const createConfettiPiece = (index: number) => {
    const shapes = ['🎉', '🎊', '⭐', '✨', '🌟', '💫', '🎆'];
    const startX = Math.random() * 100;
    
    return {
      id: index,
      emoji: shapes[Math.floor(Math.random() * shapes.length)],
      size: Math.random() * 15 + 20,
      startX,
      duration: Math.random() * 2 + 3,
      delay: Math.random() * 3,
      rotation: Math.random() * 720 + 360,
      // Pre-calculate random X positions for smooth animation
      randomX1: startX + (Math.random() * 40 - 20),
      randomX2: startX + (Math.random() * 60 - 30),
      randomX3: startX + (Math.random() * 80 - 40),
      randomX4: startX + (Math.random() * 100 - 50),
    };
  };

  const confettiPieces = Array.from({ length: 40 }, (_, i) => createConfettiPiece(i));

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto"
          onClick={onClose}
        >
          {/* Amazing Confetti Animation */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {confettiPieces.map((piece) => (
              <div
                key={piece.id}
                className="confetti-piece"
                style={{
                  '--size': `${piece.size}px`,
                  '--start-x': `${piece.startX}%`,
                  '--duration': `${piece.duration}s`,
                  '--delay': `${piece.delay}s`,
                  '--rotation': `${piece.rotation}deg`,
                  '--random-x-1': `${piece.randomX1}%`,
                  '--random-x-2': `${piece.randomX2}%`,
                  '--random-x-3': `${piece.randomX3}%`,
                  '--random-x-4': `${piece.randomX4}%`,
                  fontSize: `${piece.size}px`,
                } as React.CSSProperties}
              >
                {piece.emoji}
              </div>
            ))}
            
            {/* Center Burst Effect */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={`burst-${i}`}
                  className="burst-effect"
                  style={{
                    transform: `rotate(${i * 30}deg) translateY(-60px)`,
                    animationDelay: `${i * 0.1}s`,
                  }}
                >
                  🎆
                </div>
              ))}
            </div>

            {/* Side Sparkles */}
            {[...Array(8)].map((_, i) => (
              <div
                key={`side-burst-${i}`}
                className="absolute animate-ping"
                style={{
                  top: `${20 + Math.random() * 60}%`,
                  left: i < 4 ? `${Math.random() * 20}%` : `${80 + Math.random() * 20}%`,
                  animationDelay: `${Math.random() * 2}s`,
                  animationDuration: `${1 + Math.random()}s`,
                  fontSize: `${1 + Math.random()}rem`,
                }}
              >
                ✨
              </div>
            ))}
          </div>

          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 50 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="bg-gradient-to-br from-purple-900/95 to-blue-900/95 backdrop-blur-md rounded-2xl sm:rounded-3xl border border-white/20 shadow-2xl p-4 sm:p-6 lg:p-8 max-w-xs sm:max-w-lg lg:max-w-2xl w-full my-4 max-h-[95vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-center mb-4 sm:mb-6 lg:mb-8"
            >
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-1 sm:mb-2 font-['Fredoka']">
                🏆 Game Complete! 🏆
              </h2>
              <p className="text-white/70 text-sm sm:text-base lg:text-lg">
                Congratulations to all players!
              </p>
            </motion.div>

            {/* Podium */}
            <div className="flex items-end justify-center gap-2 sm:gap-3 lg:gap-4 mb-4 sm:mb-6 lg:mb-8 min-h-[120px] sm:min-h-[160px] lg:min-h-[200px]">
              {/* 2nd Place (Left) */}
              {showSecondPlace && (
                <motion.div
                  initial={{ y: 100, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4, type: "spring", damping: 15 }}
                  className="flex flex-col items-center"
                >
                  {/* Player Avatar */}
                  <div className="mb-2 sm:mb-3 lg:mb-4 text-center">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 bg-gradient-to-br from-gray-300 to-gray-500 rounded-full flex items-center justify-center mb-1 sm:mb-2 mx-auto border-2 sm:border-4 border-white/30">
                      <span className="text-white font-bold text-sm sm:text-lg lg:text-xl">
                        {topPlayers[1].name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="text-white font-semibold text-xs sm:text-sm">
                      {topPlayers[1].name}
                    </div>
                    <div className="text-white/70 text-xs">
                      {topPlayers[1].score} pts
                    </div>
                  </div>
                  
                  {/* Podium Base */}
                  <div className={`w-16 sm:w-18 lg:w-20 ${getPodiumHeight(2)} bg-gradient-to-t ${getPodiumColor(2)} rounded-t-lg border-2 border-white/30 flex items-center justify-center`}>
                    <span className="text-xl sm:text-2xl lg:text-3xl">{getPositionEmoji(2)}</span>
                  </div>
                  <div className="w-16 sm:w-18 lg:w-20 h-2 sm:h-3 lg:h-4 bg-gradient-to-b from-gray-600 to-gray-800 rounded-b-sm border-x-2 border-b-2 border-white/30"></div>
                </motion.div>
              )}

              {/* 1st Place (Center) */}
              <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6, type: "spring", damping: 15 }}
                className="flex flex-col items-center"
              >
                {/* Crown */}
                <motion.div
                  animate={{ rotate: [0, -5, 5, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  className="text-2xl sm:text-3xl lg:text-4xl mb-1 sm:mb-2"
                >
                  👑
                </motion.div>
                
                {/* Player Avatar */}
                <div className="mb-2 sm:mb-3 lg:mb-4 text-center">
                  <div className="w-16 h-16 sm:w-18 sm:h-18 lg:w-20 lg:h-20 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center mb-1 sm:mb-2 mx-auto border-2 sm:border-4 border-white/50 shadow-lg">
                    <span className="text-white font-bold text-lg sm:text-xl lg:text-2xl">
                      {topPlayers[0].name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="text-white font-bold text-sm sm:text-base lg:text-lg">
                    {topPlayers[0].name}
                  </div>
                  <div className="text-yellow-300 font-semibold text-xs sm:text-sm">
                    {topPlayers[0].score} pts
                  </div>
                </div>
                
                {/* Podium Base */}
                <div className={`w-18 sm:w-20 lg:w-24 ${getPodiumHeight(1)} bg-gradient-to-t ${getPodiumColor(1)} rounded-t-lg border-2 border-white/50 flex items-center justify-center shadow-lg`}>
                  <span className="text-2xl sm:text-3xl lg:text-4xl">{getPositionEmoji(1)}</span>
                </div>
                <div className="w-18 sm:w-20 lg:w-24 h-2 sm:h-3 lg:h-4 bg-gradient-to-b from-yellow-600 to-yellow-800 rounded-b-sm border-x-2 border-b-2 border-white/50"></div>
              </motion.div>

              {/* 3rd Place (Right) */}
              {showThirdPlace && (
                <motion.div
                  initial={{ y: 100, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.8, type: "spring", damping: 15 }}
                  className="flex flex-col items-center"
                >
                  {/* Player Avatar */}
                  <div className="mb-2 sm:mb-3 lg:mb-4 text-center">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center mb-1 sm:mb-2 mx-auto border-2 sm:border-4 border-white/30">
                      <span className="text-white font-bold text-sm sm:text-base lg:text-lg">
                        {topPlayers[2].name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="text-white font-semibold text-xs sm:text-sm">
                      {topPlayers[2].name}
                    </div>
                    <div className="text-white/70 text-xs">
                      {topPlayers[2].score} pts
                    </div>
                  </div>
                  
                  {/* Podium Base */}
                  <div className={`w-14 sm:w-16 lg:w-18 ${getPodiumHeight(3)} bg-gradient-to-t ${getPodiumColor(3)} rounded-t-lg border-2 border-white/30 flex items-center justify-center`}>
                    <span className="text-lg sm:text-xl lg:text-2xl">{getPositionEmoji(3)}</span>
                  </div>
                  <div className="w-14 sm:w-16 lg:w-18 h-2 sm:h-3 lg:h-4 bg-gradient-to-b from-orange-600 to-orange-800 rounded-b-sm border-x-2 border-b-2 border-white/30"></div>
                </motion.div>
              )}
            </div>

            {/* Final Scores */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 1 }}
              className="bg-white/10 rounded-lg sm:rounded-xl p-3 sm:p-4 mb-4 sm:mb-6"
            >
              <h3 className="text-white font-bold text-center mb-2 sm:mb-3 text-sm sm:text-base">Final Scores</h3>
              <div className="space-y-1 sm:space-y-2">
                {sortedPlayers.map((player, index) => (
                  <div
                    key={player.userId}
                    className="flex items-center justify-between text-white/90"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm sm:text-base lg:text-lg">
                        {index < 3 ? getPositionEmoji(index + 1) : '👤'}
                      </span>
                      <span className="font-medium text-sm sm:text-base">{player.name}</span>
                    </div>
                    <span className="font-bold text-sm sm:text-base">{player.score} pts</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Close Button */}
            <motion.button
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 1.2 }}
              onClick={() => {
                onClose();
                if (onReturnToLobby) {
                  onReturnToLobby();
                }
              }}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold py-2 sm:py-3 px-4 sm:px-6 rounded-lg sm:rounded-xl text-sm sm:text-base transition-all duration-200 transform hover:scale-105"
            >
              � Return to Lobby
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default WinnerPodium;