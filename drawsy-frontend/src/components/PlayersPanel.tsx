import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Player } from '../types/game';
import { useGameStore, useCurrentUser, useCurrentDrawer } from '../store/gameStore';

interface PlayersPanelProps {
  className?: string;
}

const PlayersPanel: React.FC<PlayersPanelProps> = ({ className = '' }) => {
  const { gameState } = useGameStore();
  const currentUser = useCurrentUser();
  const currentDrawer = useCurrentDrawer();

  // Helper function to truncate name while preserving "(you)" for current user
  const getDisplayName = (player: Player, isCurrentUser: boolean, maxLength: number = 13) => {
    if (!isCurrentUser) {
      return player.name.length > maxLength ? `${player.name.substring(0, maxLength)}...` : player.name;
    }
    
    // For current user, ensure "(you)" is always visible
    const youSuffix = ' (you)';
    const availableLength = maxLength - youSuffix.length;
    
    if (player.name.length <= availableLength) {
      return `${player.name}${youSuffix}`;
    }
    
    return `${player.name.substring(0, availableLength)}...${youSuffix}`;
  };

  if (!gameState) {
    return (
      <div className={`players-panel ${className}`}>
        <div className="text-center text-white/60">
          <div className="text-4xl mb-2">👥</div>
          <p>Loading players...</p>
        </div>
      </div>
    );
  }

  const sortedPlayers = [...gameState.players].sort((a, b) => b.score - a.score);

  const getPlayerIcon = (player: Player) => {
    if (player.userId === currentDrawer?.userId) return '🎨';
    if (player.isHost) return '👑';
    return '👤';
  };

  const getPlayerStatus = (player: Player) => {
    if (player.userId === currentDrawer?.userId) return 'Drawing';
    if (player.isHost) return 'Host';
    return 'Player';
  };

  return (
    <div className={`h-full flex flex-col ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <h3 className="text-white font-semibold flex items-center gap-2">
          👥 Players ({gameState.players.length}/{gameState.playerCount})
        </h3>
        
        {gameState.status === 'playing' && (
          <div className="text-white/60 text-sm">
            Round {gameState.currentRound}/{gameState.numRounds}
          </div>
        )}
      </div>

  {/* ...existing code... */}

      {/* Players List */}
      <div className="flex-1 overflow-y-auto min-h-0 mb-4 pr-1 space-y-2">
        <AnimatePresence>
          {sortedPlayers.map((player, index) => (
            <motion.div
              key={player.userId}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ delay: index * 0.1 }}
              className={`player-item relative w-full overflow-hidden px-3 py-2 rounded-lg ${
                player.userId === currentDrawer?.userId ? 'current-drawer bg-blue-500/20' : 'bg-white/5'
              } ${
                player.userId === currentUser?.userId ? 'ring-2 ring-white/30' : ''
              }`}
            >
              <div className="flex items-center justify-between w-full">
                {/* Left section - Icon and Player Info */}
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {/* Player Icon */}
                  <div className="text-base flex-shrink-0">
                    {getPlayerIcon(player)}
                  </div>

                  {/* Player Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 min-w-0">
                      <span 
                        className="text-sm font-medium text-white truncate flex-1" 
                        title={player.userId === currentUser?.userId ? `${player.name} (you)` : player.name}
                      >
                        {getDisplayName(player, player.userId === currentUser?.userId)}
                      </span>
                    </div>
                    
                    {/* Score */}
                    <div className="text-xs text-white/60 mt-0.5">
                      {player.score} pts
                    </div>
                  </div>
                </div>

                {/* Right section - Rank */}
                <div className="text-right flex-shrink-0 ml-2">
                  <div className="text-xs font-bold text-white">
                    #{index + 1}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Footer section */}
      <div className="flex-shrink-0 space-y-4">
        {/* Leaderboard Preview */}
        {sortedPlayers.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <div className="text-white/60 text-xs text-center mb-2">
              🏆 Current Leader
            </div>
            <div className="text-center p-3 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-lg border border-yellow-400/30">
              <div 
                className="text-yellow-400 font-bold text-sm truncate" 
                title={sortedPlayers[0].userId === currentUser?.userId ? `${sortedPlayers[0].name} (you)` : sortedPlayers[0].name}
              >
                {getDisplayName(sortedPlayers[0], sortedPlayers[0].userId === currentUser?.userId, 15)}
              </div>
              <div className="text-white/80 text-xs mt-1">
                {sortedPlayers[0].score} points
              </div>
            </div>
          </motion.div>
        )}

        {/* Tips */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-white/50 text-xs text-center"
        >
          💡 Tip: Guess correctly to earn points!
        </motion.div>
      </div>
    </div>
  );
};

export default PlayersPanel;
