import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { gameApi } from '../services/api';

const JoinRoom: React.FC = () => {
  const navigate = useNavigate();
  const [isJoining, setIsJoining] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [roomId, setRoomId] = useState('');

  const handleJoinGame = async () => {
    if (!playerName.trim()) {
      toast.error('Please enter your name');
      return;
    }

    if (!roomId.trim()) {
      toast.error('Please enter a room ID');
      return;
    }

    setIsJoining(true);
    try {
      const response = await gameApi.joinGame({
        roomId: roomId.trim().toUpperCase(),
        name: playerName.trim(),
      });

      toast.success(`Joined room ${response.roomId}!`);
      
      // Store user data in localStorage
      localStorage.setItem('drawsy_user', JSON.stringify({
        userId: response.userId,
        name: playerName.trim(),
        roomId: response.roomId,
      }));

      navigate(`/room/${response.roomId}`);
    } catch (error) {
      console.error('Failed to join game:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to join game');
    } finally {
      setIsJoining(false);
    }
  };

  const handleGoBack = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="glass-card p-8 max-w-md w-full text-center"
      >
        {/* Header */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-white mb-2 font-['Fredoka']">
            🚪 Join Game Room
          </h1>
          <p className="text-white/80">
            Enter the room ID to join an existing game
          </p>
        </motion.div>

        {/* Form */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="space-y-4"
        >
          {/* Player Name Input */}
          <div>
            <input
              type="text"
              placeholder="Enter your name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="input-field w-full text-center"
              maxLength={20}
            />
          </div>

          {/* Room ID Input */}
          <div>
            <input
              type="text"
              placeholder="Enter Room ID (e.g. ABC123)"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value.toUpperCase())}
              className="input-field w-full text-center font-mono tracking-wider"
              maxLength={6}
              style={{ textTransform: 'uppercase' }}
            />
            <p className="text-white/60 text-xs mt-2">
              Room ID is usually 6 characters long
            </p>
          </div>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="space-y-4 mt-6"
        >
          <button
            onClick={handleJoinGame}
            disabled={isJoining || !playerName.trim() || !roomId.trim()}
            className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isJoining ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Joining Room...
              </>
            ) : (
              <>
                🎮 Join Game
              </>
            )}
          </button>

          <button
            onClick={handleGoBack}
            className="btn-secondary w-full"
          >
            ← Back to Home
          </button>
        </motion.div>

        {/* Help Text */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-8 p-4 bg-white/5 rounded-lg border border-white/10"
        >
          <h3 className="text-white font-semibold mb-2">💡 How to Join</h3>
          <div className="text-white/80 text-sm text-left space-y-2">
            <p>1. Get the Room ID from your friend who created the game</p>
            <p>2. Enter your name and the Room ID</p>
            <p>3. Click "Join Game" to enter the room</p>
            <p>4. Wait for the host to start the game!</p>
          </div>
        </motion.div>

        {/* Quick Tips */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.0 }}
          className="mt-6 text-white/60 text-sm"
        >
          <div className="flex justify-center space-x-6">
            <div className="text-center">
              <div className="text-xl mb-1">⚡</div>
              <div>Fast Join</div>
            </div>
            <div className="text-center">
              <div className="text-xl mb-1">🔒</div>
              <div>Secure Rooms</div>
            </div>
            <div className="text-center">
              <div className="text-xl mb-1">🎯</div>
              <div>Easy to Use</div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default JoinRoom;
