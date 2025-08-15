import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import {
  GameState,
  Player,
  ChatMessage,
  DrawingData,
  GuessResult,
} from '../types/game';

interface GameStore {
  // Game State
  gameState: GameState | null;
  currentUser: { userId: string; name: string } | null;
  isConnected: boolean;
  isDrawing: boolean;
  currentWord: string | null;
  
  // Chat
  chatMessages: ChatMessage[];
  
  // Drawing
  drawingData: DrawingData[];
  currentDrawingColor: string;
  currentBrushSize: number;
  
  // UI State
  isLoading: boolean;
  error: string | null;
  showScores: boolean;
  
  // Actions
  setGameState: (gameState: GameState | null) => void;
  updateGameState: (updater: (prev: GameState | null) => GameState | null) => void;
  setCurrentUser: (user: { userId: string; name: string }) => void;
  setConnected: (connected: boolean) => void;
  setDrawing: (drawing: boolean) => void;
  setCurrentWord: (word: string | null) => void;
  
  // Chat Actions
  addChatMessage: (message: ChatMessage) => void;
  clearChatMessages: () => void;
  
  // Drawing Actions
  addDrawingData: (data: DrawingData) => void;
  clearDrawingData: () => void;
  setDrawingColor: (color: string) => void;
  setBrushSize: (size: number) => void;
  
  // Player Actions
  updatePlayer: (player: Player) => void;
  removePlayer: (userId: string) => void;
  updatePlayerScore: (userId: string, score: number) => void;
  
  // UI Actions
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setShowScores: (show: boolean) => void;
  
  // Game Actions
  startGame: () => void;
  endGame: () => void;
  nextRound: () => void;
  
  // Reset
  resetGame: () => void;
}

export const useGameStore = create<GameStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial State
    gameState: null,
    currentUser: null,
    isConnected: false,
    isDrawing: false,
    currentWord: null,
    chatMessages: [],
    drawingData: [],
    currentDrawingColor: '#000000',
    currentBrushSize: 4,
    isLoading: false,
    error: null,
    showScores: false,

    // Game State Actions
    setGameState: (gameState) => set({ gameState }),
    
    updateGameState: (updater) => {
      set((state) => ({ ...state, gameState: updater(state.gameState) }));
    },
    
    setCurrentUser: (user) => set({ currentUser: user }),
    
    setConnected: (connected) => set({ isConnected: connected }),
    
    setDrawing: (drawing) => set({ isDrawing: drawing }),
    
    setCurrentWord: (word) => set({ currentWord: word }),

    // Chat Actions
    addChatMessage: (message) => {
      const timestamp = Date.now();
      const messageWithTimestamp = { ...message, timestamp };
      
      set((state) => ({
        chatMessages: [...state.chatMessages, messageWithTimestamp],
      }));
    },

    clearChatMessages: () => set({ chatMessages: [] }),

    // Drawing Actions
    addDrawingData: (data) => {
      set((state) => ({
        drawingData: [...state.drawingData, data],
      }));
    },

    clearDrawingData: () => set({ drawingData: [] }),

    setDrawingColor: (color) => set({ currentDrawingColor: color }),

    setBrushSize: (size) => set({ currentBrushSize: size }),

    // Player Actions
    updatePlayer: (updatedPlayer) => {
      set((state) => {
        if (!state.gameState) return state;

        const updatedPlayers = state.gameState.players.map((player) =>
          player.userId === updatedPlayer.userId
            ? { ...player, ...updatedPlayer }
            : player
        );

        // If player doesn't exist, add them
        if (!state.gameState.players.find(p => p.userId === updatedPlayer.userId)) {
          updatedPlayers.push(updatedPlayer);
        }

        return {
          ...state,
          gameState: {
            ...state.gameState,
            players: updatedPlayers,
          },
        };
      });
    },

    removePlayer: (userId) => {
      set((state) => {
        if (!state.gameState) return state;

        const updatedPlayers = state.gameState.players.filter(
          (player) => player.userId !== userId
        );

        return {
          ...state,
          gameState: {
            ...state.gameState,
            players: updatedPlayers,
          },
        };
      });
    },

    updatePlayerScore: (userId, score) => {
      set((state) => {
        if (!state.gameState) return state;

        const updatedPlayers = state.gameState.players.map((player) =>
          player.userId === userId ? { ...player, score } : player
        );

        return {
          ...state,
          gameState: {
            ...state.gameState,
            players: updatedPlayers,
          },
        };
      });
    },

    // UI Actions
    setLoading: (loading) => set({ isLoading: loading }),

    setError: (error) => set({ error }),

    setShowScores: (show) => set({ showScores: show }),

    // Game Actions
    startGame: () => {
      set((state) => ({
        gameState: state.gameState
          ? { ...state.gameState, status: 'playing' }
          : null,
        // Keep existing chat messages when starting the game
        drawingData: [],
        error: null,
      }));
    },

    endGame: () => {
      set((state) => ({
        gameState: state.gameState
          ? { ...state.gameState, status: 'finished' }
          : null,
        isDrawing: false,
        currentWord: null,
        showScores: true,
      }));
    },

    nextRound: () => {
      set((state) => {
        if (!state.gameState) return state;

        return {
          gameState: {
            ...state.gameState,
            currentRound: state.gameState.currentRound + 1,
          },
          drawingData: [],
          currentWord: null,
        };
      });
    },

    // Reset
    resetGame: () => {
      set({
        gameState: null,
        currentUser: null,
        isConnected: false,
        isDrawing: false,
        currentWord: null,
        chatMessages: [],
        drawingData: [],
        currentDrawingColor: '#000000',
        currentBrushSize: 4,
        isLoading: false,
        error: null,
        showScores: false,
      });
    },
  }))
);

// Selectors for better performance
export const useCurrentUser = () => useGameStore((state) => state.currentUser);
export const useGameState = () => useGameStore((state) => state.gameState);
export const useIsConnected = () => useGameStore((state) => state.isConnected);
export const useIsDrawing = () => useGameStore((state) => state.isDrawing);
export const useChatMessages = () => useGameStore((state) => state.chatMessages);
export const useDrawingData = () => useGameStore((state) => state.drawingData);
export const useCurrentDrawer = () => 
  useGameStore((state) => 
    state.gameState?.players.find(p => p.userId === state.gameState?.currentDrawerUserId)
  );
export const useIsCurrentUserDrawer = () =>
  useGameStore((state) => 
    state.currentUser?.userId === state.gameState?.currentDrawerUserId
  );
