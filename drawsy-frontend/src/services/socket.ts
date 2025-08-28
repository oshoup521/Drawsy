import { io, Socket } from 'socket.io-client';
import { SocketEvents, DrawingData } from '../types/game';
import { environmentDetector } from './environment';

const SOCKET_URL = environmentDetector.getSocketUrl();

class SocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3; // Reduced from 5 to 3
  private isReconnecting = false; // Flag to prevent multiple reconnection attempts

  connect(roomId: string, userId: string): Promise<Socket> {
    return new Promise((resolve, reject) => {
      try {
        if (this.socket?.connected) {
          this.disconnect();
        }
        
        const socketOptions = {
          transports: ['polling', 'websocket'], // Try polling first for ngrok
          query: {
            roomId,
            userId,
          },
          timeout: 20000, // Increased timeout for ngrok
          forceNew: true,
          autoConnect: true,
          upgrade: true,
          rememberUpgrade: false,
          extraHeaders: {
            'ngrok-skip-browser-warning': 'true',
            'User-Agent': 'DrawsyApp/1.0',
          },
          withCredentials: true,
        };

        this.socket = io(SOCKET_URL, socketOptions);

        this.socket.on('connect', () => {
          this.reconnectAttempts = 0;
          this.isReconnecting = false;
          resolve(this.socket!);
        });

        this.socket.on('disconnect', (reason) => {
          // Only auto-reconnect for certain disconnect reasons and if not manually disconnected
          if (reason === 'io server disconnect' || reason === 'io client disconnect') {
            // Server or client initiated disconnect, don't reconnect
            return;
          }
          
          // Don't reconnect if already trying to reconnect
          if (!this.isReconnecting) {
            this.handleReconnect(roomId, userId);
          }
        });

        this.socket.on('connect_error', (error) => {
          reject(new Error(`Failed to connect: ${error.message}`));
        });

        this.socket.on('error', (error) => {
          // Socket error occurred
        });

        // Set connection timeout (increased for ngrok)
        setTimeout(() => {
          if (!this.socket?.connected) {
            reject(new Error('Connection timeout'));
          }
        }, 20000);

      } catch (error) {
        reject(error);
      }
    });
  }

  private handleReconnect(roomId: string, userId: string) {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.isReconnecting = false;
      return;
    }

    if (this.isReconnecting) {
      return;
    }

    this.isReconnecting = true;
    this.reconnectAttempts++;
    const delay = Math.min(2000 * Math.pow(2, this.reconnectAttempts), 15000); // Reduced delays
    
    setTimeout(() => {
      if (this.isReconnecting) {
        this.connect(roomId, userId).catch(() => {
          this.isReconnecting = false;
        });
      }
    }, delay);
  }

  disconnect() {
    if (this.socket) {
      this.isReconnecting = false; // Stop any reconnection attempts
      this.reconnectAttempts = 0; // Reset reconnect attempts
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Event emitters
  startGame() {
    if (!this.isConnected()) {
      return;
    }
    this.emit('start_game');
  }

  selectTopic(topic: string) {
    this.emit('select_topic', { topic });
  }

  selectWord(word: string, topic: string) {
    if (!this.isConnected()) {
      return;
    }
    this.emit('select_word', { word, topic });
  }

  sendDrawingData(data: Parameters<SocketEvents['drawing_data']>[0]) {
    this.emit('drawing_data', data);
  }

  sendGuess(data: Parameters<SocketEvents['guess_word']>[0]) {
    this.emit('guess_word', data);
  }

  sendChatMessage(data: Parameters<SocketEvents['chat_message']>[0]) {
    this.emit('chat_message', data);
  }

  sendTypingStart(data: Parameters<SocketEvents['typing_start']>[0]) {
    this.emit('typing_start', data);
  }

  sendTypingStop(data: Parameters<SocketEvents['typing_stop']>[0]) {
    this.emit('typing_stop', data);
  }

  sendClearCanvas() {
    this.emit('clear_canvas');
  }

  loadDrawingData() {
    this.emit('load_drawing_data');
  }

  endRound() {
    this.emit('end_round');
  }

  // Event listeners
  onPlayerJoined(callback: (data: Parameters<SocketEvents['player_joined']>[0]) => void) {
    this.on('player_joined', callback);
  }

  onPlayerLeft(callback: (data: Parameters<SocketEvents['player_left']>[0]) => void) {
    this.on('player_left', callback);
  }

  onHostChanged(callback: (data: { previousHost: { userId: string; name: string }; newHost: { userId: string; name: string } }) => void) {
    this.on('host_changed', callback);
  }

  onGameStart(callback: (data: Parameters<SocketEvents['start_game_response']>[0]) => void) {
    this.on('start_game', (data) => {
      callback(data);
    });
  }

  onGameStarted(callback: (data: any) => void) {
    this.on('game_started', (data) => {
      callback(data);
    });
  }

  onNextRoundStarted(callback: (data: any) => void) {
    this.on('next_round_started', (data) => {
      callback(data);
    });
  }

  onRequestTopicSelection(callback: (data: any) => void) {
    this.on('request_topic_selection', callback);
  }

  onTopicWords(callback: (data: any) => void) {
    this.on('topic_words', callback);
  }

  onRoundStarted(callback: (data: any) => void) {
    this.on('round_started', (data) => {
      callback(data);
    });
  }

  onDrawingData(callback: (data: Parameters<SocketEvents['drawing_data_broadcast']>[0]) => void) {
    this.on('drawing_data', callback);
  }

  onGuessResult(callback: (data: Parameters<SocketEvents['guess_result']>[0]) => void) {
    this.on('guess_result', callback);
  }

  onCorrectGuess(callback: (data: Parameters<SocketEvents['correct_guess']>[0]) => void) {
    this.on('correct_guess', callback);
  }

  onAISuggestion(callback: (data: Parameters<SocketEvents['ai_suggestion']>[0]) => void) {
    this.on('ai_suggestion', callback);
  }

  onDrawerWord(callback: (data: { word: string; topic: string }) => void) {
    this.on('drawer_word', callback);
  }

  onChatMessage(callback: (data: Parameters<SocketEvents['chat_message_broadcast']>[0]) => void) {
    this.on('chat_message', callback);
  }

  onTypingStart(callback: (data: Parameters<SocketEvents['typing_start_broadcast']>[0]) => void) {
    this.on('typing_start', callback);
  }

  onTypingStop(callback: (data: Parameters<SocketEvents['typing_stop_broadcast']>[0]) => void) {
    this.on('typing_stop', callback);
  }

  onAISuggestions(callback: (data: { message: string; suggestions: string[]; senderId: string }) => void) {
    this.on('ai_suggestions', callback);
  }

  onClearCanvas(callback: () => void) {
    this.on('clear_canvas', callback);
  }

  onDrawingDataLoaded(callback: (data: DrawingData[]) => void) {
    this.on('drawing_data_loaded', callback);
  }

  onRoundEnded(callback: (data: any) => void) {
    this.on('end_round', callback);
  }

  onGameOver(callback: (data: Parameters<SocketEvents['game_over']>[0]) => void) {
    this.on('game_over', callback);
  }

  onError(callback: (data: Parameters<SocketEvents['error']>[0]) => void) {
    this.on('error', callback);
  }

  // Generic event handlers
  private emit(event: string, data?: any) {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    }
  }

  private on(event: string, callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  // Utility methods
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  getSocketId(): string | undefined {
    return this.socket?.id;
  }

  // Remove all listeners
  removeAllListeners() {
    if (this.socket) {
      this.socket.removeAllListeners();
    }
  }

  // Remove specific listener
  removeListener(event: string) {
    if (this.socket) {
      this.socket.off(event);
    }
  }
}

// Export singleton instance
export const socketService = new SocketService();
export default socketService;
