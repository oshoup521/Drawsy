import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { gameApi } from '../services/api';
import { DEFAULT_GAME_SETTINGS } from '../types/game';

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [isCreating, setIsCreating] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [gameSettings, setGameSettings] = useState(DEFAULT_GAME_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);

  const handleCreateGame = async () => {
    if (!playerName.trim()) {
      toast.error('Please enter your name');
      return;
    }

    setIsCreating(true);
    try {
      const response = await gameApi.createGame({
        ...gameSettings,
        hostName: playerName.trim(),
      });

      toast.success(`Game room created! Room ID: ${response.roomId}`);
      
      // Store user data in localStorage
      localStorage.setItem('scribbl_user', JSON.stringify({
        userId: response.hostUserId,
        name: playerName.trim(),
        roomId: response.roomId,
      }));

      navigate(`/room/${response.roomId}`);
    } catch (error) {
      console.error('Failed to create game:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create game');
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinGame = () => {
    navigate('/join');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="glass-card p-8 max-w-md w-full text-center"
      >
        {/* Logo and Title */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-white mb-2 font-['Fredoka']">
            🎨 Scribbl AI
          </h1>
          <p className="text-white/80">
            Draw, Guess, Win with AI-powered fun!
          </p>
        </motion.div>

        {/* Player Name Input */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mb-6"
        >
          <input
            type="text"
            placeholder="Enter your name"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            className="input-field w-full text-center"
            maxLength={20}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleCreateGame();
              }
            }}
          />
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="space-y-4"
        >
          <button
            onClick={handleCreateGame}
            disabled={isCreating || !playerName.trim()}
            className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCreating ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Creating Room...
              </>
            ) : (
              <>
                🎮 Create Game Room
              </>
            )}
          </button>

          <button
            onClick={handleJoinGame}
            className="btn-secondary w-full"
          >
            🚪 Join Existing Room
          </button>

          <button
            onClick={() => setShowSettings(!showSettings)}
            className="text-white/60 hover:text-white/80 text-sm transition-colors"
          >
            ⚙️ Game Settings
          </button>
        </motion.div>

        {/* Game Settings */}
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-6 p-4 bg-white/5 rounded-lg border border-white/10"
          >
            <h3 className="text-white font-semibold mb-4">Game Settings</h3>
            
            <div className="space-y-4 text-left">
              <div>
                <label className="block text-white/80 text-sm mb-2">
                  Max Players: {gameSettings.playerCount}
                </label>
                <input
                  type="range"
                  min="2"
                  max="20"
                  value={gameSettings.playerCount}
                  onChange={(e) =>
                    setGameSettings({
                      ...gameSettings,
                      playerCount: parseInt(e.target.value),
                    })
                  }
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-white/80 text-sm mb-2">
                  Guess Time: {gameSettings.guessTime}s
                </label>
                <input
                  type="range"
                  min="30"
                  max="180"
                  step="15"
                  value={gameSettings.guessTime}
                  onChange={(e) =>
                    setGameSettings({
                      ...gameSettings,
                      guessTime: parseInt(e.target.value),
                    })
                  }
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-white/80 text-sm mb-2">
                  Number of Rounds: {gameSettings.numRounds}
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={gameSettings.numRounds}
                  onChange={(e) =>
                    setGameSettings({
                      ...gameSettings,
                      numRounds: parseInt(e.target.value),
                    })
                  }
                  className="w-full"
                />
              </div>
            </div>
          </motion.div>
        )}

        {/* Features */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-8 text-white/60 text-sm"
        >
          <div className="flex justify-center space-x-6">
            <div className="text-center">
              <div className="text-xl mb-1">🤖</div>
              <div>AI Powered</div>
            </div>
            <div className="text-center">
              <div className="text-xl mb-1">🎨</div>
              <div>Real-time Drawing</div>
            </div>
            <div className="text-center">
              <div className="text-xl mb-1">👥</div>
              <div>Multiplayer</div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default HomePage;
