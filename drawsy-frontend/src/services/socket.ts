import { io, Socket } from 'socket.io-client';
import { SocketEvents } from '../types/game';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:3000';

class SocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3; // Reduced from 5 to 3
  private isReconnecting = false; // Flag to prevent multiple reconnection attempts

  connect(roomId: string, userId: string): Promise<Socket> {
    return new Promise((resolve, reject) => {
      try {
        if (this.socket?.connected) {
          console.log('⚠️ Already connected, disconnecting first');
          this.disconnect();
        }

        console.log(`🔌 Connecting to socket: ${SOCKET_URL}`);
        
        this.socket = io(SOCKET_URL, {
          transports: ['websocket', 'polling'],
          query: {
            roomId,
            userId,
          },
          timeout: 10000,
          forceNew: true,
          autoConnect: true,
        });

        this.socket.on('connect', () => {
          console.log('✅ Socket connected:', this.socket?.id);
          this.reconnectAttempts = 0;
          this.isReconnecting = false;
          resolve(this.socket!);
        });

        this.socket.on('disconnect', (reason) => {
          console.log('❌ Socket disconnected:', reason);
          
          // Only auto-reconnect for certain disconnect reasons and if not manually disconnected
          if (reason === 'io server disconnect' || reason === 'io client disconnect') {
            // Server or client initiated disconnect, don't reconnect
            console.log('🛑 Manual disconnect, not reconnecting');
            return;
          }
          
          // Don't reconnect if already trying to reconnect
          if (!this.isReconnecting) {
            this.handleReconnect(roomId, userId);
          }
        });

        this.socket.on('connect_error', (error) => {
          console.error('❌ Socket connection error:', error);
          reject(new Error(`Failed to connect: ${error.message}`));
        });

        this.socket.on('error', (error) => {
          console.error('❌ Socket error:', error);
        });

        // Set connection timeout
        setTimeout(() => {
          if (!this.socket?.connected) {
            reject(new Error('Connection timeout'));
          }
        }, 10000);

      } catch (error) {
        console.error('❌ Socket connection failed:', error);
        reject(error);
      }
    });
  }

  private handleReconnect(roomId: string, userId: string) {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached, stopping reconnection');
      this.isReconnecting = false;
      return;
    }

    if (this.isReconnecting) {
      console.log('⚠️ Already reconnecting, skipping...');
      return;
    }

    this.isReconnecting = true;
    this.reconnectAttempts++;
    const delay = Math.min(2000 * Math.pow(2, this.reconnectAttempts), 15000); // Reduced delays
    
    console.log(`🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      if (this.isReconnecting) {
        this.connect(roomId, userId).catch((error) => {
          console.error('Reconnection failed:', error);
          this.isReconnecting = false;
        });
      }
    }, delay);
  }

  disconnect() {
    if (this.socket) {
      console.log('🔌 Disconnecting socket');
      this.isReconnecting = false; // Stop any reconnection attempts
      this.reconnectAttempts = 0; // Reset reconnect attempts
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Event emitters
  startGame() {
    this.emit('start_game');
  }

  sendDrawingData(data: Parameters<SocketEvents['drawing_data']>[0]) {
    this.emit('drawing_data', data);
  }

  sendGuess(data: Parameters<SocketEvents['guess_word']>[0]) {
    this.emit('guess_word', data);
  }

  sendChatMessage(data: Parameters<SocketEvents['chat_message']>[0]) {
    console.log('📤 Socket service sending chat message:', data);
    this.emit('chat_message', data);
  }

  endRound() {
    this.emit('end_round_request');
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

  onRoundEnd(callback: (data: Parameters<SocketEvents['end_round']>[0]) => void) {
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
    } else {
      console.warn('⚠️ Socket not connected, cannot emit:', event);
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
