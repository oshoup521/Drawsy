import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useGameStore, useCurrentUser, useCurrentDrawer } from '../store/gameStore';
import socketService from '../services/socket';

interface GuessPanelProps {
  className?: string;
}

const GuessPanel: React.FC<GuessPanelProps> = ({ className = '' }) => {
  const [guessMessage, setGuessMessage] = useState('');
  const guessRef = useRef<HTMLInputElement>(null);

  const { gameState } = useGameStore();
  const currentUser = useCurrentUser();
  const currentDrawer = useCurrentDrawer();

  const isGamePlaying = gameState?.status === 'playing';
  const isCurrentUserDrawer = currentUser?.userId === currentDrawer?.userId;
  const hasAlreadyGuessedCorrectly = currentUser && gameState?.correctGuessers?.includes(currentUser.userId);

  const handleSendGuess = () => {
    if (!guessMessage.trim() || !currentUser || !gameState?.roomId) return;

    const guess = guessMessage.trim();

    // Send guess via socket
    socketService.sendGuess({
      userId: currentUser.userId,
      guess,
    });

    // Clear guess input
    setGuessMessage('');
    guessRef.current?.focus();
  };

  const handleGuessKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSendGuess();
    }
  };

  // Show different content based on user role
  if (!isGamePlaying || isCurrentUserDrawer) {
    return null; // Don't show when game is not playing or user is the drawer
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`guess-panel ${className}`}
    >
      <div className="glass-card p-3 h-full">
        {hasAlreadyGuessedCorrectly ? (
          /* Show success message for players who already guessed correctly */
          <div className="h-full flex flex-col justify-center items-center text-center">
            <div className="text-4xl mb-2">🎉</div>
            <div className="text-green-300 font-semibold text-sm mb-1">
              You guessed correctly!
            </div>
            <div className="text-white/60 text-xs">
              Wait for others to guess or for the round to end
            </div>
          </div>
        ) : (
          /* Show guess input for other players */
          <div className="h-full flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-blue-300 font-semibold text-sm">🎯 Make Your Guess:</span>
              {gameState?.wordLength && (
                <span className="text-white/60 text-xs">
                  ({gameState.wordLength} letters)
                </span>
              )}
            </div>

            <div className="guess-input-container flex gap-2 mb-1">
              <input
                ref={guessRef}
                type="text"
                value={guessMessage}
                onChange={(e) => setGuessMessage(e.target.value)}
                onKeyDown={handleGuessKeyPress}
                placeholder="What do you think it is?"
                className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-blue-400/50 focus:bg-white/15 transition-all text-sm"
                maxLength={50}
                autoComplete="off"
              />

              <button
                onClick={handleSendGuess}
                disabled={!guessMessage.trim()}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors text-sm"
              >
                Guess!
              </button>
            </div>

            <div className="text-center text-white/60 text-xs">
              💡 Tip: Look at the drawing and type what you think it represents!
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default GuessPanel;