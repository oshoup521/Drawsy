import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

import DrawingCanvas from '../components/DrawingCanvas';
import ChatPanel from '../components/ChatPanel';
import PlayersPanel from '../components/PlayersPanel';
import GuessPanel from '../components/GuessPanel';
import VerticalColorPalette from '../components/VerticalColorPalette';
import GameFlow from '../components/GameFlow';
import CompactTimer from '../components/CompactTimer';
import WinnerPodium from '../components/WinnerPodium';
import { useGameStore, useIsCurrentUserDrawer } from '../store/gameStore';
import { gameApi } from '../services/api';
import socketService from '../services/socket';

const GameRoom: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [showScores, setShowScores] = useState(false);
  const [showWinnerPodium, setShowWinnerPodium] = useState(false);
  const [timerActive, setTimerActive] = useState(false);
  
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
    setCurrentRoomId,
    resetGame,
    resetAll,
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
        // Set current room ID for chat persistence (clear chats if switching rooms)
        if (mounted) {
          setCurrentRoomId(roomId);
        }

        // Get user data from localStorage
        const userData = localStorage.getItem('drawsy_user');
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

        // Get game state with better error handling
        console.log('🎮 Fetching game state for room:', roomId);
        const gameStateData = await gameApi.getGameState(roomId);
        console.log('🎮 Received game state:', gameStateData);
        
        // Validate and sanitize the game state structure
        if (!gameStateData) {
          throw new Error('No game state received from server');
        }
        
        // Ensure players array exists and is properly initialized
        const sanitizedGameState = {
          ...gameStateData,
          players: gameStateData.players || [],
          status: gameStateData.status || 'waiting',
          currentRound: gameStateData.currentRound || 1,
          roomId: gameStateData.roomId || roomId,
        };
        
        console.log('🎮 Sanitized game state:', sanitizedGameState);
        
        if (mounted) {
          setGameState(sanitizedGameState);
        }

        // Connect to socket
        if (mounted) {
          await socketService.connect(roomId, user.userId);
          setConnected(true);

          toast.success('Connected to game room!');
        }
      } catch (error) {
        if (mounted) {
          console.error('❌ Failed to initialize game room:', error);
          const errorMessage = error instanceof Error ? error.message : 'Failed to connect to room';
          toast.error(`Connection failed: ${errorMessage}`);
          
          // Don't navigate away immediately on ngrok, give user a chance to retry
          const isNgrok = window.location.hostname.includes('ngrok');
          if (!isNgrok) {
            navigate('/');
          }
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
      socketService.disconnect();
      setConnected(false);
      resetGame();
    };
  }, [roomId, navigate, setCurrentUser, setGameState, setConnected, resetGame]);

  // Set up socket event listeners
  useEffect(() => {
    if (!isConnected) return;

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
      // Get fresh state instead of relying on closure
      const currentState = useGameStore.getState();
      const freshGameState = currentState.gameState;
      
      const player = freshGameState?.players.find(p => p.userId === data.userId);
      
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
      // Get fresh state instead of relying on closure
      const currentState = useGameStore.getState();
      const freshGameState = currentState.gameState;
      
      // Reset the starting state since game has started
      setIsStarting(false);
      
      // Create new game state directly - PRESERVE existing players array
      if (freshGameState && freshGameState.players && freshGameState.players.length > 0) {
        const newGameState = {
          ...freshGameState, // Keep all existing state including players
          status: 'playing' as const,
          currentDrawerUserId: data.drawerUserId,
          currentRound: data.currentRound,
          // Don't set wordLength yet - word hasn't been selected
        };
        
        // Use setGameState for immediate state update
        setGameState(newGameState);
        
        // Check for lost players and recover if needed
        setTimeout(() => {
          const currentState = useGameStore.getState().gameState;
          
          if (!currentState?.players || currentState.players.length === 0) {
            // Try to recover by fetching fresh game state
            if (roomId) {
              gameApi.getGameState(roomId).then(freshState => {
                setGameState(freshState);
              }).catch(() => {});
            }
          }
        }, 100);
      } else {
        // Fetch fresh game state to recover
        if (roomId) {
          gameApi.getGameState(roomId).then(freshState => {
            setGameState({
              ...freshState,
              status: 'playing' as const,
              currentDrawerUserId: data.drawerUserId,
              currentRound: data.currentRound,
            });
          }).catch(() => {});
        }
      }
      
      // Add a system message to indicate game started
      addChatMessage({
        userId: 'system',
        message: `🎮 Game started! ${data.drawerName} is selecting a topic to draw...`,
        isAI: true,
        timestamp: Date.now(),
      });

      toast.success(`Game started! ${data.drawerName} is the first drawer.`);
    };

    // Chat events
    const handleChatMessage = (data: any) => {
      addChatMessage({
        userId: data.userId,
        message: data.message,
        aiSuggestions: data.aiSuggestions,
        isAI: data.isAI || false,
        timestamp: Date.now(),
      });
    };

    // Correct guess events
    const handleCorrectGuess = (data: { userId: string; playerName: string; scoreAwarded: number }) => {
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

    // Round started event - activate timer
    const handleRoundStarted = (data: any) => {
      setTimerActive(true);
      
      updateGameState((prev) => prev ? {
        ...prev,
        currentRound: data.roundNumber,
        wordLength: data.wordLength,
        topic: data.topic,
      } : null);
    };

    // Round ended event
    const handleRoundEnded = (data: any) => {
      setTimerActive(false);
      
      // Show the correct word and scores briefly
      addChatMessage({
        userId: 'system',
        message: `⏰ Time's up! The word was "${data.correctWord}"`,
        isAI: true,
        timestamp: Date.now(),
      });

      // Update scores if provided
      if (data.scores) {
        data.scores.forEach((playerScore: any) => {
          updatePlayer({
            userId: playerScore.userId,
            name: playerScore.name,
            score: playerScore.score,
          });
        });
      }
    };

    // Game over event
    const handleGameOver = (data: any) => {
      setTimerActive(false);
      
      // Update final scores
      if (data.finalScores) {
        data.finalScores.forEach((playerScore: any) => {
          updatePlayer({
            userId: playerScore.userId,
            name: playerScore.name,
            score: playerScore.score,
          });
        });
      }

      // Update game state to finished
      updateGameState((prev) => prev ? {
        ...prev,
        status: 'finished'
      } : null);

      // Show winner announcement
      addChatMessage({
        userId: 'system',
        message: `🎉 Game Over! ${data.winner.name} wins with ${data.winner.score} points!`,
        isAI: true,
        timestamp: Date.now(),
      });

      // Show winner podium after a brief delay
      setTimeout(() => {
        setShowWinnerPodium(true);
      }, 1000);

      toast.success(`🏆 ${data.winner.name} wins the game!`);
    };

    // Set up the event listeners
    socketService.onPlayerJoined(handlePlayerJoined);
    socketService.onPlayerLeft(handlePlayerLeft);
    socketService.onHostChanged(handleHostChanged);
    socketService.onGameStarted(handleGameStart);
    socketService.onChatMessage(handleChatMessage);
    socketService.onCorrectGuess(handleCorrectGuess);
    socketService.onRoundStarted(handleRoundStarted);
    socketService.onRoundEnded(handleRoundEnded);
    socketService.onGameOver(handleGameOver);

    // Cleanup function - this useEffect will run whenever isConnected changes
    return () => {
      // Remove all event listeners to prevent duplicates
      socketService.removeListener('player_joined');
      socketService.removeListener('player_left');
      socketService.removeListener('host_changed');
      socketService.removeListener('game_started');
      socketService.removeListener('chat_message');
      socketService.removeListener('correct_guess');
      socketService.removeListener('round_started');
      socketService.removeListener('end_round');
      socketService.removeListener('game_over');
    };
  }, [isConnected, updatePlayer, removePlayer, updateHost, addChatMessage, setGameState, roomId, gameState?.players, updateGameState]);

  const handleStartGame = async () => {
    if (!roomId || !gameState) {
      return;
    }
    
    // Prevent multiple calls if already starting or game has started
    if (isStarting || gameState.status !== 'waiting') {
      return;
    }

    setIsStarting(true);
    
    try {
      // Only use WebSocket to start game - the socket handler will update DB and broadcast to all clients
      socketService.startGame();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to start game');
      setIsStarting(false); // Reset loading state on error
    }
    // Note: setIsStarting(false) will be called when we receive the game_started event
  };

  const handleLeaveRoom = () => {
    socketService.disconnect();
    localStorage.removeItem('drawsy_user');
    resetAll(); // Use resetAll to clear everything including chat
    navigate('/');
  };

  // Timer handlers
  const handleTimeUp = () => {
    setTimerActive(false);
    
    // Send end round request to server
    if (roomId && gameState?.status === 'playing') {
      socketService.endRound();
      
      addChatMessage({
        userId: 'system',
        message: '⏰ Time\'s up! Round ending...',
        isAI: true,
        timestamp: Date.now(),
      });
    }
  };

  const handleTimerTick = (remainingTime: number) => {
    // Optional: Handle timer tick events
  };

  const handleReturnToLobby = () => {
    // Reset the game state to lobby
    setShowWinnerPodium(false);
    
    // Reset the game to initial state but keep players and room
    if (gameState && roomId) {
      // Update game state to waiting status
      const lobbyState = {
        ...gameState,
        status: 'waiting' as const,
        currentRound: 0,
        numRounds: gameState.numRounds || 3,
        currentDrawerUserId: undefined,
        currentWord: undefined,
        wordLength: undefined,
        topic: undefined,
        // Reset all player scores
        players: gameState.players.map(player => ({
          ...player,
          score: 0,
        }))
      };
      
      setGameState(lobbyState);
      setTimerActive(false);
      
      // Clear any existing chat messages from the previous game
      // (Optional: you might want to keep some messages)
      
      toast.success('Returned to lobby! Ready for a new game!');
    }
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
    const isNgrok = window.location.hostname.includes('ngrok');
    
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card p-8 text-center">
          <p className="text-white mb-4">Failed to load game room</p>
          <div className="flex gap-2 justify-center">
            {isNgrok && (
              <button 
                onClick={() => window.location.reload()} 
                className="btn-secondary"
              >
                Retry Connection
              </button>
            )}
            <button onClick={() => navigate('/')} className="btn-primary">
              Go Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Additional null safety check for players array
  if (!gameState.players) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card p-8 text-center">
          <div className="loading-spinner mx-auto mb-4"></div>
          <p className="text-white">Loading game data...</p>
        </div>
      </div>
    );
  }

  const isHost = gameState.players.find(p => p.userId === currentUser.userId)?.isHost;
  const canStartGame = isHost && gameState.status === 'waiting' && gameState.players.length >= 2;

  // Render lobby for waiting state
  if (gameState.status === 'waiting') {
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
              🎨 Drawsy - Lobby
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
                <div className="flex gap-2">
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

                </div>
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
            {/* Players List */}
            <div className="glass-card p-6 flex flex-col" style={{ height: 'calc(100% - 180px)' }}>
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                👥 Players ({gameState.players.length}/{gameState.playerCount})
              </h2>
              
              <div className="lobby-players-list space-y-3 flex-1 overflow-y-auto min-h-0">
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
            <div className="glass-card p-6 flex-shrink-0" style={{ height: '164px' }}>
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
  return (
    <GameFlow timerActive={timerActive} setTimerActive={setTimerActive}>
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900">
      {/* Game Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="game-header"
      >
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold font-['Fredoka']">
            🎨 Drawsy
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
            {gameState.topic && (
              <span className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full">
                Topic: {gameState.topic}
              </span>
            )}
            {gameState.wordLength && !isCurrentUserDrawer && (
              <span className="px-3 py-1 bg-yellow-500/20 text-yellow-300 rounded-full">
                Word: {'_ '.repeat(gameState.wordLength).trim()}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {timerActive && gameState.guessTime && (
            <CompactTimer
              duration={gameState.guessTime}
              isActive={timerActive}
              onTimeUp={handleTimeUp}
              onTick={handleTimerTick}
            />
          )}
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
          className="w-64 h-full"
        >
          <div className="glass-card p-6 h-full flex flex-col">
            <PlayersPanel className="flex-1" />
          </div>
        </motion.div>

        {/* Vertical Color Palette */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex flex-col justify-center h-full"
        >
          <VerticalColorPalette 
            disabled={!isCurrentUserDrawer || gameState.status !== 'playing'}
            className="h-full"
          />
        </motion.div>

        {/* Center - Drawing Canvas and Guess Panel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-1 h-full flex flex-col gap-3"
        >
          {/* Drawing Canvas - Full height for drawer, reduced for guessers */}
          <div className={`glass-card p-4 flex flex-col ${
            isCurrentUserDrawer ? 'h-full' : 'h-[calc(100%-120px)]'
          }`}>
            <DrawingCanvas
              disabled={!isCurrentUserDrawer || gameState.status !== 'playing'}
            />
            {/* Word to guess display for non-drawers */}
            {gameState.status === 'playing' && gameState.wordLength && !isCurrentUserDrawer && (
              <div className="flex flex-col items-center mt-4">
                <span className="font-mono text-lg text-white tracking-wider">
                  {'_ '.repeat(gameState.wordLength).trim()}
                </span>
              </div>
            )}
          </div>
          {/* Guess Panel - Only shown for non-drawers */}
          {!isCurrentUserDrawer && (
            <div className="h-[100px] flex-shrink-0">
              <GuessPanel />
            </div>
          )}
        </motion.div>

        {/* Right Sidebar - Chat */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-80 h-full"
        >
          <div className="glass-card p-6 h-full flex flex-col">
            <ChatPanel className="flex-1" />
          </div>
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

      {/* Winner Podium */}
      <WinnerPodium
        isOpen={showWinnerPodium}
        players={gameState?.players || []}
        onClose={() => setShowWinnerPodium(false)}
        onReturnToLobby={handleReturnToLobby}
      />
      </div>
    </GameFlow>
  );
};

export default GameRoom;
