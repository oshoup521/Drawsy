import React from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../store/gameStore';

interface GameSettingsProps {
  className?: string;
}

const GameSettings: React.FC<GameSettingsProps> = ({ className = '' }) => {
  const { gameState } = useGameStore();

  if (!gameState) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white/10 backdrop-blur-md rounded-lg p-4 border border-white/20 ${className}`}
    >
      <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
        ⚙️ Game Settings
      </h3>
      
      <div className="space-y-3 text-white/80">
        <div className="flex justify-between items-center">
          <span className="text-sm">Rounds:</span>
          <span className="font-semibold text-white">{gameState.numRounds}</span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-sm">Drawing Time:</span>
          <span className="font-semibold text-white">{gameState.guessTime}s</span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-sm">Max Players:</span>
          <span className="font-semibold text-white">{gameState.playerCount}</span>
        </div>

        {gameState.status === 'playing' && (
          <>
            <div className="border-t border-white/20 pt-3 mt-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">Current Round:</span>
                <span className="font-semibold text-green-400">
                  {gameState.currentRound} / {gameState.numRounds}
                </span>
              </div>
              
              {gameState.topic && (
                <div className="flex justify-between items-center mt-2">
                  <span className="text-sm">Topic:</span>
                  <span className="font-semibold text-blue-400 capitalize">
                    {gameState.topic}
                  </span>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
};

export default GameSettings;