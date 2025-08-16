import axios from 'axios';
import {
  CreateGameRequest,
  CreateGameResponse,
  JoinGameRequest,
  JoinGameResponse,
  GameState,
  Player,
} from '../types/game';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for logging
api.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle common errors
    if (error.response?.status === 404) {
      throw new Error('Game room not found');
    } else if (error.response?.status === 400) {
      throw new Error(error.response.data.message || 'Invalid request');
    } else if (error.response?.status >= 500) {
      throw new Error('Server error. Please try again later.');
    } else if (error.code === 'ECONNABORTED') {
      throw new Error('Request timeout. Please check your connection.');
    } else {
      throw new Error(error.response?.data?.message || 'An unexpected error occurred');
    }
  }
);

export const gameApi = {
  // Create a new game room
  createGame: async (data: CreateGameRequest): Promise<CreateGameResponse> => {
    const response = await api.post<CreateGameResponse>('/game', data);
    return response.data;
  },

  // Join an existing game room
  joinGame: async (data: JoinGameRequest): Promise<JoinGameResponse> => {
    const response = await api.post<JoinGameResponse>('/game/join', data);
    return response.data;
  },

  // Get current game state
  getGameState: async (roomId: string): Promise<GameState> => {
    const response = await api.get<GameState>(`/game/${roomId}`);
    return response.data;
  },

  // Get game scores
  getScores: async (roomId: string): Promise<Player[]> => {
    const response = await api.get<Player[]>(`/game/${roomId}/scores`);
    return response.data;
  },

  // Start the game
  startGame: async (roomId: string): Promise<any> => {
    const response = await api.post(`/game/${roomId}/start`);
    return response.data;
  },

  // Select next drawer in rotation
  selectNextDrawer: async (roomId: string): Promise<{
    previousDrawerUserId?: string;
    currentDrawerUserId: string;
    drawerName: string;
    totalActivePlayers: number;
    roundNumber: number;
  }> => {
    const response = await api.post(`/game/${roomId}/next-drawer`);
    return response.data;
  },

  // Get a random drawer from active players
  getRandomDrawer: async (roomId: string): Promise<{
    drawerId: string;
    drawerName: string;
    totalActivePlayers: number;
    availableDrawers: number;
  }> => {
    const response = await api.get(`/game/${roomId}/random-drawer`);
    return response.data;
  },

  // Start next round with new drawer and word
  startNextRound: async (roomId: string): Promise<{
    roundNumber: number;
    drawerUserId: string;
    drawerName: string;
    wordLength: number;
    topic: string;
    totalRounds: number;
    word?: string;
  }> => {
    const response = await api.post(`/game/${roomId}/next-round`);
    return response.data;
  },
};

export default api;
