import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

import DrawingCanvas from '../components/DrawingCanvas';
import ChatPanel from '../components/ChatPanel';
import PlayersPanel from '../components/PlayersPanel';
import { useGameStore, useIsCurrentUserDrawer } from '../store/gameStore';
import { gameApi } from '../services/api';
import socketService from '../services/socket';

const GameRoom: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [showScores, setShowScores] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  
  const {
    gameState,
    currentUser,
    isConnected,
    setGameState,
    updateGameState,
    setCurrentUser,
    setConnected,
    updatePlayer,
    removePlayer,
    updateHost,
    addChatMessage,
    resetGame,
  } = useGameStore();

  const isCurrentUserDrawer = useIsCurrentUserDrawer();

  // Initialize game room
  useEffect(() => {
    let mounted = true;
    
    const initializeRoom = async () => {
      if (!roomId || !mounted) {
        return;
      }

      if (!mounted) return;
      
      try {
        // Get user data from localStorage
        const userData = localStorage.getItem('scribbl_user');
        if (!userData) {
          if (mounted) {
            toast.error('Please join the room first');
            navigate('/join');
          }
          return;
        }

        const user = JSON.parse(userData);
        if (mounted) {
          setCurrentUser(user);
        }

        // Get game state
        const gameStateData = await gameApi.getGameState(roomId);
        if (mounted) {
          setGameState(gameStateData);
        }

        // Connect to socket
        if (mounted) {
          await socketService.connect(roomId, user.userId);
          setConnected(true);

          toast.success('Connected to game room!');
        }
      } catch (error) {
        console.error('Failed to initialize room:', error);
        if (mounted) {
          toast.error(error instanceof Error ? error.message : 'Failed to connect to room');
          navigate('/');
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initializeRoom();

    // Cleanup function
    return () => {
      mounted = false;
      console.log('🧹 GameRoom cleanup: disconnecting socket');
      socketService.disconnect();
      setConnected(false);
      resetGame();
    };
  }, [roomId, navigate, setCurrentUser, setGameState, setConnected, resetGame]);

  // Set up socket event listeners
  useEffect(() => {
    if (!isConnected) return;

    console.log('🔌 Setting up socket event listeners');

    // Player events
    const handlePlayerJoined = (data: any) => {
      updatePlayer({
        userId: data.userId,
        name: data.name,
        score: 0,
        isActive: true,
      });
      
      addChatMessage({
        userId: 'system',
        message: `${data.name} joined the game!`,
        isAI: true,
        timestamp: Date.now(),
      });
    };

    const handlePlayerLeft = (data: any) => {
      const currentState = useGameStore.getState();
      const player = currentState.gameState?.players.find(p => p.userId === data.userId);
      if (player) {
        removePlayer(data.userId);
        
        // Only show message for actual player departures, not rapid reconnections
        setTimeout(() => {
          const currentState = useGameStore.getState();
          const stillExists = currentState.gameState?.players.find(p => p.userId === data.userId);
          if (!stillExists) {
            addChatMessage({
              userId: 'system',
              message: `${player.name || 'Player'} left the game`,
              isAI: true,
              timestamp: Date.now(),
            });
          }
        }, 2000); // Wait 2 seconds to see if they reconnect
      }
    };

    const handleHostChanged = (data: { previousHost: { userId: string; name: string }; newHost: { userId: string; name: string } }) => {
      console.log('👑 Host changed event received:', data);
      
      // Update the host in the game state
      updateHost(data.newHost.userId);
      
      // Add a system message
      addChatMessage({
        userId: 'system',
        message: `👑 ${data.previousHost.name} left and ${data.newHost.name} is now the host!`,
        isAI: true,
        timestamp: Date.now(),
      });

      // Show toast notification
      toast(`👑 ${data.newHost.name} is now the host!`, {
        icon: '👑',
      });
    };

    // Game events
    const handleGameStart = (data: any) => {
      console.log('🎮 Game started event received:', data);
      
      // Force re-render with local state
      setGameStarted(true);
      
      // Use updateGameState which accepts a function
      updateGameState((currentGameState) => {
        console.log('📊 Current game state before update:', currentGameState);
        
        if (currentGameState) {
          const newGameState = {
            ...currentGameState,
            status: 'playing' as const,
            currentDrawerUserId: data.drawerUserId,
            currentRound: data.currentRound,
            wordLength: data.wordLength,
          };
          console.log('📊 New state after update:', newGameState);
          return newGameState;
        }
        return currentGameState;
      });

      // Add a system message to indicate game started and chat continues
      addChatMessage({
        userId: 'system',
        message: `🎮 Round ${data.currentRound} started! ${data.topic ? `Topic: ${data.topic}` : ''} Chat continues from lobby...`,
        isAI: true,
        timestamp: Date.now(),
      });

      toast.success(`Round ${data.currentRound} started!`);
    };

    // Chat events
    const handleChatMessage = (data: any) => {
      console.log('💬 Received chat message:', data);
      addChatMessage({
        userId: data.userId,
        message: data.message,
        aiSuggestion: data.aiSuggestion,
        timestamp: Date.now(),
      });
    };

    // Correct guess events
    const handleCorrectGuess = (data: { userId: string; playerName: string; scoreAwarded: number }) => {
      console.log('🎯 Correct guess event received:', data);
      
      // Update the player's score in the game state
      updatePlayer({
        userId: data.userId,
        name: data.playerName,
        score: (gameState?.players.find(p => p.userId === data.userId)?.score || 0) + data.scoreAwarded,
      });

      // Add a celebratory chat message
      addChatMessage({
        userId: 'system',
        message: `🎉 ${data.playerName} guessed correctly! +${data.scoreAwarded} points!`,
        isAI: true,
        timestamp: Date.now(),
      });

      // Show toast notification
      toast.success(`🎯 ${data.playerName} got it right! +${data.scoreAwarded} points!`);
    };

    // Set up the event listeners
    socketService.onPlayerJoined(handlePlayerJoined);
    socketService.onPlayerLeft(handlePlayerLeft);
    socketService.onHostChanged(handleHostChanged);
    socketService.onGameStart(handleGameStart);
    socketService.onChatMessage(handleChatMessage);
    socketService.onCorrectGuess(handleCorrectGuess);

    // Cleanup function - this useEffect will run whenever isConnected changes
    return () => {
      console.log('🧹 Cleaning up socket event listeners');
      // Note: socketService should ideally have removeListener methods
    };
  }, [isConnected, updatePlayer, removePlayer, updateHost, addChatMessage, updateGameState]);

  const handleStartGame = async () => {
    if (!roomId || !gameState) return;

    setIsStarting(true);
    try {
      await gameApi.startGame(roomId);
      socketService.startGame();
      toast.success('Game started!');
    } catch (error) {
      console.error('Failed to start game:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to start game');
    } finally {
      setIsStarting(false);
    }
  };

  const handleLeaveRoom = () => {
    socketService.disconnect();
    localStorage.removeItem('scribbl_user');
    navigate('/');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card p-8 text-center">
          <div className="loading-spinner mx-auto mb-4"></div>
          <p className="text-white">Connecting to game room...</p>
        </div>
      </div>
    );
  }

  if (!gameState || !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card p-8 text-center">
          <p className="text-white mb-4">Failed to load game room</p>
          <button onClick={() => navigate('/')} className="btn-primary">
            Go Home
          </button>
        </div>
      </div>
    );
  }

  const isHost = gameState.players.find(p => p.userId === currentUser.userId)?.isHost;
  const canStartGame = isHost && gameState.status === 'waiting' && gameState.players.length >= 2;

  console.log('🎮 GameRoom render - Current game status:', gameState.status);
  console.log('🎮 GameRoom render - Is host:', isHost);
  console.log('🎮 GameRoom render - Can start game:', canStartGame);
  console.log('🎮 GameRoom render - Game started flag:', gameStarted);

  // Render lobby for waiting state (and game hasn't been started via socket)
  if (gameState.status === 'waiting' && !gameStarted) {
    console.log('🎮 Rendering lobby (waiting state)');
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="game-header"
        >
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold font-['Fredoka']">
              🎨 Scribbl AI - Lobby
            </h1>
            <div className="flex items-center gap-2 text-sm">
              <div 
                className="px-3 py-1 bg-white/20 rounded-full cursor-pointer hover:bg-white/30 transition-colors flex items-center gap-2 group"
                onClick={() => {
                  navigator.clipboard.writeText(roomId || '');
                  toast.success('Room ID copied to clipboard!');
                }}
                title="Click to copy room ID"
              >
                <span>Room: {roomId}</span>
                <span className="opacity-50 group-hover:opacity-100 transition-opacity">📋</span>
              </div>
              <span className={`px-3 py-1 rounded-full ${
                isConnected ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'
              }`}>
                {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isHost ? (
              canStartGame && (
                <button
                  onClick={handleStartGame}
                  disabled={isStarting}
                  className="btn-primary flex items-center gap-2 disabled:opacity-50"
                >
                  {isStarting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Starting...
                    </>
                  ) : (
                    <>🚀 Start Game</>
                  )}
                </button>
              )
            ) : (
              gameState.players.length >= 2 && (
                <span className="text-white/60">Waiting for the host to start the game...</span>
              )
            )}
            <button
              onClick={handleLeaveRoom}
              className="btn-secondary"
            >
              🚪 Leave
            </button>
          </div>
        </motion.div>

        {/* Lobby Content */}
        <div className="flex flex-1 gap-6 p-6 max-w-6xl mx-auto h-[calc(100vh-100px)]">
          {/* Players Panel - Left Side */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="w-80 space-y-4 flex flex-col h-full"
          >
            <div className="glass-card p-6 flex-1 flex flex-col">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                👥 Players ({gameState.players.length}/{gameState.playerCount})
              </h2>
              
              <div className="lobby-players-list space-y-3 flex-1 min-h-0">
                {gameState.players.map((player) => (
                  <div
                    key={player.userId}
                    className={`flex items-center gap-3 p-3 rounded-lg ${
                      player.isHost ? 'bg-yellow-500/20 border border-yellow-400/30' : 'bg-white/10'
                    }`}
                  >
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold">
                        {player.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="text-white font-semibold">
                        {player.userId === currentUser.userId ? 'You' : player.name}
                      </div>
                      {player.isHost && (
                        <div className="text-yellow-400 text-xs">👑 Host</div>
                      )}
                    </div>
                  </div>
                ))}

                {gameState.players.length < gameState.playerCount && (
                  <div className="mt-4 p-3 border-2 border-dashed border-white/30 rounded-lg text-center text-white/60">
                    Waiting for more players...
                  </div>
                )}
              </div>
            </div>

            {/* Game Settings */}
            <div className="glass-card p-6 flex-shrink-0">
              <h3 className="text-lg font-bold text-white mb-3">🎮 Game Settings</h3>
              <div className="space-y-2 text-white/80">
                <div className="flex justify-between">
                  <span>Rounds:</span>
                  <span>{gameState.numRounds}</span>
                </div>
                <div className="flex justify-between">
                  <span>Guess Time:</span>
                  <span>{gameState.guessTime}s</span>
                </div>
                <div className="flex justify-between">
                  <span>Max Players:</span>
                  <span>{gameState.playerCount}</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Chat Panel - Right Side */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex-1"
          >
            <div className="glass-card p-6 h-full flex flex-col">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                💬 Lobby Chat
              </h2>
              <div className="flex-1 min-h-0">
                <ChatPanel />
              </div>
            </div>
          </motion.div>
        </div>

  {/* The waiting text for non-hosts is now shown at the top, not here. */}
      </div>
    );
  }

  // Render game area for playing state
  console.log('🎮 Rendering game area (playing state)');
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900">
      {/* Game Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="game-header"
      >
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold font-['Fredoka']">
            🎨 Scribbl AI
          </h1>
          <div className="flex items-center gap-2 text-sm">
            <span className="px-3 py-1 bg-white/20 rounded-full">
              Room: {roomId}
            </span>
            <span className={`px-3 py-1 rounded-full ${
              isConnected ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'
            }`}>
              {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
            </span>
            <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full">
              Round {gameState.currentRound}/{gameState.numRounds}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleLeaveRoom}
            className="btn-secondary"
          >
            🚪 Leave
          </button>
        </div>
      </motion.div>

      {/* Game Area Layout */}
      <div className="flex flex-1 gap-4 p-4 h-[calc(100vh-100px)]">
        {/* Left Sidebar - Players List */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-64 flex flex-col"
        >
          <PlayersPanel />
        </motion.div>

        {/* Center - Drawing Canvas */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-1"
        >
          <DrawingCanvas
            disabled={!isCurrentUserDrawer || gameState.status !== 'playing'}
          />
        </motion.div>

        {/* Right Sidebar - Chat */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-80 flex flex-col"
        >
          <ChatPanel />
        </motion.div>
      </div>

      {/* Scores Modal */}
      <AnimatePresence>
        {showScores && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowScores(false)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="glass-card p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-2xl font-bold text-white text-center mb-6">
                🏆 Scores
              </h2>
              
              <div className="space-y-3">
                {[...gameState.players]
                  .sort((a, b) => b.score - a.score)
                  .map((player, index) => (
                    <div
                      key={player.userId}
                      className={`flex items-center justify-between p-3 rounded-lg ${
                        index === 0 ? 'bg-yellow-500/20 border border-yellow-400/30' :
                        index === 1 ? 'bg-gray-400/20 border border-gray-400/30' :
                        index === 2 ? 'bg-orange-600/20 border border-orange-400/30' :
                        'bg-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">
                          {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '👤'}
                        </span>
                        <span className="font-semibold text-white">
                          {player.userId === currentUser.userId ? 'You' : player.name}
                        </span>
                      </div>
                      <span className="text-white font-bold">
                        {player.score} pts
                      </span>
                    </div>
                  ))}
              </div>

              <button
                onClick={() => setShowScores(false)}
                className="btn-primary w-full mt-6"
              >
                Continue
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GameRoom;
