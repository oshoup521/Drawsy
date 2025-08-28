import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Player } from '../types/game';
import { celebratePodium } from '../utils/confetti';

interface WinnerPodiumProps {
  isOpen: boolean;
  players: Player[];
  isDraw?: boolean;
  winners?: Player[];
  onClose: () => void;
  onReturnToLobby?: () => void;
}

const WinnerPodium: React.FC<WinnerPodiumProps> = ({ isOpen, players, isDraw, winners, onClose, onReturnToLobby }) => {
  // Sort players by score (highest first)
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  // Group players by rank to handle ties properly
  const getRankGroups = () => {
    const groups: { [key: number]: Player[] } = {};
    sortedPlayers.forEach(player => {
      const rank = player.rank || 1;
      if (!groups[rank]) {
        groups[rank] = [];
      }
      groups[rank].push(player);
    });
    return groups;
  };

  const rankGroups = getRankGroups();

  // Get top 3 unique ranks for podium display
  const getTopRanks = () => {
    const uniqueRanks = Object.keys(rankGroups).map(Number).sort((a, b) => a - b);
    return uniqueRanks.slice(0, 3);
  };

  const topRanks = getTopRanks();

  const getPositionEmoji = (position: number) => {
    switch (position) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return '🏆';
    }
  };

  // Trigger confetti when podium opens
  useEffect(() => {
    if (isOpen) {
      celebratePodium();
    }
  }, [isOpen]);



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


          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 50 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="bg-gradient-to-br from-purple-900/95 to-blue-900/95 backdrop-blur-md rounded-2xl sm:rounded-3xl border border-white/20 shadow-2xl p-3 sm:p-4 lg:p-6 max-w-xs sm:max-w-lg lg:max-w-2xl w-full h-fit max-h-[95vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-center mb-3 sm:mb-4 lg:mb-6 flex-shrink-0"
            >
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-1 font-['Fredoka']">
                🏆 Game Complete! 🏆
              </h2>
              <p className="text-white/70 text-xs sm:text-sm lg:text-base">
                {isDraw ? 
                  (winners && winners.length > 1 ? 
                    `It's a draw between ${winners.length} players!` : 
                    "It's a draw! Everyone tied!"
                  ) : 
                  "Congratulations to all players!"
                }
              </p>
            </motion.div>

            {/* Podium */}
            <div className="flex items-end justify-center gap-2 sm:gap-3 lg:gap-4 mb-3 sm:mb-4 lg:mb-6 min-h-[100px] sm:min-h-[120px] lg:min-h-[140px] flex-shrink-0">
              {/* Handle special case for draws */}
              {isDraw ? (
                // Show all winners on equal height podiums
                winners?.slice(0, 3).map((winner, index) => (
                  <motion.div
                    key={winner.userId}
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4 + (index * 0.2), type: "spring", damping: 15 }}
                    className="flex flex-col items-center"
                  >
                    {/* Crown for draws */}
                    <motion.div
                      animate={{ rotate: [0, -5, 5, 0] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      className="text-lg sm:text-xl lg:text-2xl mb-1"
                    >
                      👑
                    </motion.div>

                    {/* Player Avatar */}
                    <div className="mb-1 sm:mb-2 lg:mb-3 text-center">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center mb-1 mx-auto border-2 border-white/50 shadow-lg">
                        <span className="text-white font-bold text-sm sm:text-base lg:text-lg">
                          {winner.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="text-white font-bold text-xs sm:text-sm lg:text-base">
                        {winner.name}
                      </div>
                      <div className="text-yellow-300 font-semibold text-xs">
                        {winner.score} pts
                      </div>
                    </div>

                    {/* Equal height podium for draws */}
                    <div className="w-16 sm:w-18 lg:w-20 h-16 sm:h-20 lg:h-24 bg-gradient-to-t from-yellow-400 to-yellow-600 rounded-t-lg border-2 border-white/50 flex items-center justify-center shadow-lg">
                      <span className="text-2xl sm:text-3xl lg:text-4xl">🏆</span>
                    </div>
                    <div className="w-16 sm:w-18 lg:w-20 h-2 sm:h-3 lg:h-4 bg-gradient-to-b from-yellow-600 to-yellow-800 rounded-b-sm border-x-2 border-b-2 border-white/50"></div>
                  </motion.div>
                ))
              ) : (
                // Traditional podium layout for non-draws
                <>
                  {/* 2nd Place (Left) */}
                  {topRanks.includes(2) && rankGroups[2] && (
                    <motion.div
                      initial={{ y: 100, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.4, type: "spring", damping: 15 }}
                      className="flex flex-col items-center"
                    >
                      {/* Player Avatar */}
                      <div className="mb-1 sm:mb-2 lg:mb-3 text-center">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 bg-gradient-to-br from-gray-300 to-gray-500 rounded-full flex items-center justify-center mb-1 mx-auto border-2 border-white/30">
                          <span className="text-white font-bold text-xs sm:text-sm lg:text-base">
                            {rankGroups[2][0].name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="text-white font-semibold text-xs">
                          {rankGroups[2][0].name}
                          {rankGroups[2].length > 1 && <span className="text-white/60"> (+{rankGroups[2].length - 1})</span>}
                        </div>
                        <div className="text-white/70 text-xs">
                          {rankGroups[2][0].score} pts
                        </div>
                      </div>

                      {/* Podium Base */}
                      <div className="w-16 sm:w-18 lg:w-20 h-12 sm:h-16 lg:h-20 bg-gradient-to-t from-gray-300 to-gray-500 rounded-t-lg border-2 border-white/30 flex items-center justify-center">
                        <span className="text-xl sm:text-2xl lg:text-3xl">🥈</span>
                      </div>
                      <div className="w-16 sm:w-18 lg:w-20 h-2 sm:h-3 lg:h-4 bg-gradient-to-b from-gray-600 to-gray-800 rounded-b-sm border-x-2 border-b-2 border-white/30"></div>
                    </motion.div>
                  )}

                  {/* 1st Place (Center) */}
                  {topRanks.includes(1) && rankGroups[1] && (
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
                        className="text-lg sm:text-xl lg:text-2xl mb-1"
                      >
                        👑
                      </motion.div>

                      {/* Player Avatar */}
                      <div className="mb-1 sm:mb-2 lg:mb-3 text-center">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center mb-1 mx-auto border-2 border-white/50 shadow-lg">
                          <span className="text-white font-bold text-sm sm:text-base lg:text-lg">
                            {rankGroups[1][0].name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="text-white font-bold text-xs sm:text-sm lg:text-base">
                          {rankGroups[1][0].name}
                          {rankGroups[1].length > 1 && <span className="text-yellow-200"> (+{rankGroups[1].length - 1})</span>}
                        </div>
                        <div className="text-yellow-300 font-semibold text-xs">
                          {rankGroups[1][0].score} pts
                        </div>
                      </div>

                      {/* Podium Base */}
                      <div className="w-18 sm:w-20 lg:w-24 h-16 sm:h-20 lg:h-24 bg-gradient-to-t from-yellow-400 to-yellow-600 rounded-t-lg border-2 border-white/50 flex items-center justify-center shadow-lg">
                        <span className="text-2xl sm:text-3xl lg:text-4xl">🥇</span>
                      </div>
                      <div className="w-18 sm:w-20 lg:w-24 h-2 sm:h-3 lg:h-4 bg-gradient-to-b from-yellow-600 to-yellow-800 rounded-b-sm border-x-2 border-b-2 border-white/50"></div>
                    </motion.div>
                  )}

                  {/* 3rd Place (Right) */}
                  {topRanks.includes(3) && rankGroups[3] && (
                    <motion.div
                      initial={{ y: 100, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.8, type: "spring", damping: 15 }}
                      className="flex flex-col items-center"
                    >
                      {/* Player Avatar */}
                      <div className="mb-1 sm:mb-2 lg:mb-3 text-center">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center mb-1 mx-auto border-2 border-white/30">
                          <span className="text-white font-bold text-xs sm:text-sm lg:text-base">
                            {rankGroups[3][0].name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="text-white font-semibold text-xs">
                          {rankGroups[3][0].name}
                          {rankGroups[3].length > 1 && <span className="text-white/60"> (+{rankGroups[3].length - 1})</span>}
                        </div>
                        <div className="text-white/70 text-xs">
                          {rankGroups[3][0].score} pts
                        </div>
                      </div>

                      {/* Podium Base */}
                      <div className="w-14 sm:w-16 lg:w-18 h-8 sm:h-12 lg:h-14 bg-gradient-to-t from-orange-400 to-orange-600 rounded-t-lg border-2 border-white/30 flex items-center justify-center">
                        <span className="text-lg sm:text-xl lg:text-2xl">🥉</span>
                      </div>
                      <div className="w-14 sm:w-16 lg:w-18 h-2 sm:h-3 lg:h-4 bg-gradient-to-b from-orange-600 to-orange-800 rounded-b-sm border-x-2 border-b-2 border-white/30"></div>
                    </motion.div>
                  )}
                </>
              )}
            </div>

            {/* Final Scores */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 1 }}
              className="bg-white/10 rounded-lg p-2 sm:p-3 mb-3 sm:mb-4 flex-1 min-h-0 overflow-y-auto"
            >
              <h3 className="text-white font-bold text-center mb-2 text-xs sm:text-sm">Final Scores</h3>
              <div className="space-y-1">
                {sortedPlayers.map((player, index) => (
                  <div
                    key={player.userId}
                    className="flex items-center justify-between text-white/90"
                  >
                    <div className="flex items-center gap-1 sm:gap-2">
                      <span className="text-xs sm:text-sm">
                        {player.rank && player.rank <= 3 ? getPositionEmoji(player.rank) : '👤'}
                      </span>
                      <span className="font-medium text-xs sm:text-sm truncate">{player.name}</span>
                      <span className="text-white/50 text-xs">
                        ({player.rank ? `#${player.rank}` : `#${index + 1}`})
                      </span>
                    </div>
                    <span className="font-bold text-xs sm:text-sm">{player.score} pts</span>
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
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold py-2 px-4 rounded-lg text-sm transition-all duration-200 transform hover:scale-105 flex-shrink-0"
            >
              🏠 Return to Lobby
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default WinnerPodium;