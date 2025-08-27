export interface Player {
  userId: string;
  name: string;
  score: number;
  isHost?: boolean;
  isActive?: boolean;
}

export interface GameState {
  roomId: string;
  playerCount: number;
  guessTime: number;
  numRounds: number;
  players: Player[];
  currentRound: number;
  status: 'waiting' | 'playing' | 'finished';
  hostUserId?: string;
  currentDrawerUserId?: string;
  currentWord?: string;
  wordLength?: number;
  topic?: string;
}

export interface CreateGameRequest {
  playerCount: number;
  guessTime: number;
  numRounds: number;
  hostName: string;
}

export interface CreateGameResponse {
  roomId: string;
  gameId: string;
  hostUserId: string;
}

export interface JoinGameRequest {
  roomId: string;
  name: string;
}

export interface JoinGameResponse {
  userId: string;
  roomId: string;
  gameId: string;
}

export interface DrawingData {
  x: number;
  y: number;
  color: string;
  lineWidth: number;
  strokeId?: string;
  isDrawing?: boolean;
}

export interface GuessWordData {
  userId: string;
  guess: string;
}

export interface ChatMessage {
  userId: string;
  message: string;
  aiSuggestions?: string[];
  timestamp?: number;
  isAI?: boolean;
}

export interface GuessResult {
  userId: string;
  guess: string;
  correct: boolean;
  funnyResponse?: string;
  scoreAwarded: number;
}

// WebSocket Events
export interface SocketEvents {
  // Client to Server
  start_game: () => void;
  select_topic: (data: { topic: string }) => void;
  select_word: (data: { word: string; topic: string }) => void;
  drawing_data: (data: DrawingData) => void;
  guess_word: (data: GuessWordData) => void;
  chat_message: (data: { userId: string; message: string }) => void;
  end_round_request: () => void;

  // Server to Client
  player_joined: (data: { userId: string; name: string }) => void;
  player_left: (data: { userId: string }) => void;
  game_started: (data: {
    currentRound: number;
    drawerUserId: string;
    drawerName: string;
    totalPlayers: number;
  }) => void;
  request_topic_selection: (data: {
    drawerUserId: string;
    roundNumber: number;
  }) => void;
  topic_words: (data: {
    topic: string;
    aiWords: string[];
    fallbackWords: string[];
    drawerUserId: string;
  }) => void;
  round_started: (data: {
    roundNumber: number;
    drawerUserId: string;
    topic: string;
    wordLength: number;
    guessTime: number;
  }) => void;
  drawer_word: (data: { word: string; topic: string }) => void;
  start_game_response: (data: {
    currentRound: number;
    drawerUserId: string;
    wordLength: number;
    topic?: string;
  }) => void;
  drawing_data_broadcast: (data: DrawingData) => void;
  guess_result: (data: GuessResult) => void;
  correct_guess: (data: { userId: string; playerName: string; scoreAwarded: number }) => void;
  ai_suggestion: (data: { topic: string; word: string }) => void;
  chat_message_broadcast: (data: ChatMessage) => void;
  end_round: (data: {
    roundId: string;
    correctWord: string;
    scores: Player[];
  }) => void;
  game_over: (data: {
    winner: Player;
    finalScores: Player[];
  }) => void;
  error: (data: { message: string }) => void;
}

export interface GameSettings {
  playerCount: number;
  guessTime: number;
  numRounds: number;
}

export const DEFAULT_GAME_SETTINGS: GameSettings = {
  playerCount: 4,
  guessTime: 60,
  numRounds: 3,
};

export const DRAWING_COLORS = [
  '#000000', // Black
  '#FFFFFF', // White
  '#FF0000', // Red
  '#00FF00', // Green
  '#0000FF', // Blue
  '#FFFF00', // Yellow
  '#FF00FF', // Magenta
  '#00FFFF', // Cyan
  '#FFA500', // Orange
  '#800080', // Purple
  '#FFC0CB', // Pink
  '#A52A2A', // Brown
  '#808080', // Gray
  '#90EE90', // Light Green
  '#87CEEB', // Sky Blue
  '#DDA0DD', // Plum
];
