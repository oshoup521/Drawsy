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
    <div className={`players-panel ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold flex items-center gap-2">
          👥 Players ({gameState.players.length}/{gameState.playerCount})
        </h3>
        
        {gameState.status === 'playing' && (
          <div className="text-white/60 text-sm">
            Round {gameState.currentRound}/{gameState.numRounds}
          </div>
        )}
      </div>

      {/* Current Word Length (for non-drawers) */}
      {gameState.status === 'playing' && gameState.wordLength && currentUser?.userId !== currentDrawer?.userId && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-3 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-lg border border-purple-400/30"
        >
          <div className="text-center">
            <div className="text-white/80 text-sm mb-1">Word to guess:</div>
            <div className="font-mono text-lg text-white tracking-wider">
              {'_ '.repeat(gameState.wordLength).trim()}
            </div>
            <div className="text-white/60 text-xs mt-1">
              {gameState.wordLength} letters
            </div>
          </div>
        </motion.div>
      )}

      {/* Players List */}
      <div className="players-list flex-1 min-h-0">
        <AnimatePresence>
          {sortedPlayers.map((player, index) => (
            <motion.div
              key={player.userId}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ delay: index * 0.1 }}
              className={`player-item ${
                player.userId === currentDrawer?.userId ? 'current-drawer' : ''
              } ${
                player.userId === currentUser?.userId ? 'ring-2 ring-white/30' : ''
              }`}
            >
              <div className="flex items-center gap-3 flex-1">
                {/* Player Icon */}
                <div className="text-xl">
                  {getPlayerIcon(player)}
                </div>

                {/* Player Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white truncate">
                      {player.userId === currentUser?.userId ? 'You' : player.name}
                    </span>
                    
                    {/* Player Status Badge */}
                    <span className="text-xs px-2 py-1 bg-white/20 rounded-full text-white/80">
                      {getPlayerStatus(player)}
                    </span>
                  </div>
                  
                  {/* Score */}
                  <div className="text-sm text-white/60">
                    {player.score} points
                  </div>
                </div>

                {/* Rank */}
                <div className="text-right">
                  <div className="text-lg font-bold text-white">
                    #{index + 1}
                  </div>
                </div>
              </div>

              {/* Drawing Indicator */}
              {player.userId === currentDrawer?.userId && (
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full"
                />
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Game Status */}
      <div className="mt-4 p-3 bg-white/5 rounded-lg border border-white/10">
        <div className="text-center">
          <div className="text-white/80 text-sm mb-2">Game Status</div>
          
          {gameState.status === 'waiting' && (
            <div className="text-yellow-400">
              ⏳ Waiting for players...
            </div>
          )}
          
          {gameState.status === 'playing' && (
            <div className="text-green-400">
              🎮 Game in Progress
            </div>
          )}
          
          {gameState.status === 'finished' && (
            <div className="text-blue-400">
              🏆 Game Finished
            </div>
          )}
        </div>
      </div>

      {/* Leaderboard Preview */}
      {sortedPlayers.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-4"
        >
          <div className="text-white/60 text-xs text-center mb-2">
            🏆 Current Leader
          </div>
          <div className="text-center p-2 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-lg border border-yellow-400/30">
            <div className="text-yellow-400 font-bold">
              {sortedPlayers[0].userId === currentUser?.userId ? 'You' : sortedPlayers[0].name}
            </div>
            <div className="text-white/80 text-sm">
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
        className="mt-4 text-white/50 text-xs text-center"
      >
        💡 Tip: Guess correctly to earn points!
      </motion.div>
    </div>
  );
};

export default PlayersPanel;
