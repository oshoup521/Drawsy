import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { GameService } from '../services/game.service';
import { LLMService } from '../services/llm.service';
import { DrawingDataDto } from '../dto/drawing-data.dto';
import { GuessWordDto } from '../dto/guess-word.dto';

interface ConnectedClient {
  socket: Socket;
  roomId: string;
  userId: string;
}

@WebSocketGateway({
  cors: {
    origin: true, // Allow all origins for testing
    credentials: true,
    methods: ['GET', 'POST'],
    allowedHeaders: [
      'Content-Type', 
      'Authorization', 
      'X-Requested-With',
      'ngrok-skip-browser-warning',
      'Accept',
      'Origin'
    ],
  },
})
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger = new Logger(GameGateway.name);
  private connectedClients = new Map<string, ConnectedClient>();

  constructor(
    private gameService: GameService,
    private llmService: LLMService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const roomId = client.handshake.query.roomId as string;
      const userId = client.handshake.query.userId as string;

      if (!roomId || !userId) {
        client.disconnect();
        return;
      }

      // Join the room
      client.join(roomId);
      
      this.connectedClients.set(client.id, {
        socket: client,
        roomId,
        userId,
      });

      // Get player details from database to show correct name
      try {
        const player = await this.gameService.getPlayer(roomId, userId);
        
        // Notify others that a player joined with their actual name
        client.to(roomId).emit('player_joined', {
          userId,
          name: player.name,
        });

        this.logger.log(`Player ${player.name} (${client.id}) connected to room ${roomId}`);
      } catch (error) {
        this.logger.warn(`Could not get player details for ${userId}: ${error.message}`);
        
        // Fallback to generic name if player not found in DB
        client.to(roomId).emit('player_joined', {
          userId,
          name: 'Player',
        });

        this.logger.log(`Client ${client.id} connected to room ${roomId}`);
      }
    } catch (error) {
      this.logger.error('Connection error:', error);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const clientInfo = this.connectedClients.get(client.id);
    if (clientInfo) {
      this.connectedClients.delete(client.id);
      this.logger.log(`Client ${client.id} disconnected from room ${clientInfo.roomId}`);
      
      // Only emit player_left after a delay to avoid spam from reconnections
      setTimeout(async () => {
        // Check if the user has any other active connections
        const hasOtherConnections = Array.from(this.connectedClients.values())
          .some(conn => conn.userId === clientInfo.userId && conn.roomId === clientInfo.roomId);
        
        if (!hasOtherConnections) {
          // User has no other connections, they actually left
          try {
            const removeResult = await this.gameService.removePlayer(clientInfo.roomId, clientInfo.userId);
            
            if (removeResult) {
              // Emit basic player_left event
              client.to(clientInfo.roomId).emit('player_left', {
                userId: clientInfo.userId,
              });

              // If the host left and there's a new host, notify everyone
              if (removeResult.playerRemoved.wasHost && removeResult.newHost) {
                this.server.to(clientInfo.roomId).emit('host_changed', {
                  previousHost: {
                    userId: removeResult.playerRemoved.userId,
                    name: removeResult.playerRemoved.name,
                  },
                  newHost: {
                    userId: removeResult.newHost.userId,
                    name: removeResult.newHost.name,
                  },
                });
                this.logger.log(`Host changed in room ${clientInfo.roomId}: ${removeResult.newHost.name} is now host`);
              }

              // If the game ended because no players left
              if (removeResult.gameEnded) {
                this.server.to(clientInfo.roomId).emit('game_ended', {
                  reason: 'all_players_left'
                });
                this.logger.log(`Game ended in room ${clientInfo.roomId} - no players remaining`);
              }

              this.logger.log(`Player ${clientInfo.userId} left room ${clientInfo.roomId}`);
            }
          } catch (error) {
            this.logger.error(`Error removing player ${clientInfo.userId} from room ${clientInfo.roomId}:`, error);
            // Still emit the basic player_left event as fallback
            client.to(clientInfo.roomId).emit('player_left', {
              userId: clientInfo.userId,
            });
          }
        }
      }, 3000); // Wait 3 seconds before confirming they left
    }
  }

  @SubscribeMessage('start_game')
  async handleStartGame(@ConnectedSocket() client: Socket) {
    try {
      const clientInfo = this.connectedClients.get(client.id);
      if (!clientInfo) return;

      const gameData = await this.gameService.startGame(clientInfo.roomId);
      
      // Get the current game state to find the drawer
      const gameState = await this.gameService.getGameState(clientInfo.roomId);
      
      console.log('🎮 Backend sending start_game event with data:', {
        ...gameData,
        currentWord: undefined,
      });
      
      // Broadcast game start to all players (without the word)
      this.server.to(clientInfo.roomId).emit('start_game', {
        ...gameData,
        currentWord: undefined, // Don't send word to everyone
      });
      
      // Send the word only to the drawer
      const drawerConnection = Array.from(this.connectedClients.values())
        .find(conn => conn.userId === gameData.drawerUserId && conn.roomId === clientInfo.roomId);
      
      if (drawerConnection) {
        drawerConnection.socket.emit('drawer_word', {
          word: gameData.currentWord,
          topic: gameData.topic,
        });
      }
      
      // Send AI suggestion for the topic
      this.server.to(clientInfo.roomId).emit('ai_suggestion', {
        topic: gameData.topic,
        word: '***hidden***', // Don't reveal the actual word
      });
      
    } catch (error) {
      this.logger.error('Start game error:', error);
      client.emit('error', { message: error.message });
    }
  }

  @SubscribeMessage('drawing_data')
  async handleDrawingData(
    @MessageBody() drawingData: DrawingDataDto,
    @ConnectedSocket() client: Socket,
  ) {
    const clientInfo = this.connectedClients.get(client.id);
    if (!clientInfo) return;

    // Broadcast drawing data to all other players in the room
    client.to(clientInfo.roomId).emit('drawing_data', drawingData);
  }

  @SubscribeMessage('guess_word')
  async handleGuessWord(
    @MessageBody() guessData: GuessWordDto,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const clientInfo = this.connectedClients.get(client.id);
      if (!clientInfo) return;

      const result = await this.gameService.checkGuess(
        clientInfo.roomId,
        guessData.userId,
        guessData.guess,
      );

      // Broadcast the guess result to all players
      this.server.to(clientInfo.roomId).emit('guess_result', result);

      if (result.correct) {
        // Broadcast correct guess event
        this.server.to(clientInfo.roomId).emit('correct_guess', {
          userId: result.userId,
          playerName: result.playerName,
          scoreAwarded: result.scoreAwarded,
        });

        // You might want to end the round here or continue
        // For now, we'll just notify about the correct guess
      }

    } catch (error) {
      this.logger.error('Guess word error:', error);
      client.emit('error', { message: error.message });
    }
  }

  @SubscribeMessage('chat_message')
  async handleChatMessage(
    @MessageBody() data: { userId: string; message: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const clientInfo = this.connectedClients.get(client.id);
      if (!clientInfo) {
        this.logger.warn('Chat message from unknown client');
        return;
      }

      this.logger.log(`Chat message from ${data.userId}: ${data.message}`);

      // Skip AI suggestion for now to test basic functionality
      let aiSuggestion = "";
      try {
        aiSuggestion = await this.llmService.generateChatSuggestion(
          data.message,
        );
      } catch (error) {
        this.logger.warn('Failed to generate AI suggestion, continuing without it:', error.message);
      }

      const chatData = {
        userId: data.userId,
        message: data.message,
        aiSuggestion,
      };

      this.logger.log(`Broadcasting chat message to room ${clientInfo.roomId}:`, chatData);

      // Broadcast chat message to all players in the room
      this.server.to(clientInfo.roomId).emit('chat_message', chatData);

    } catch (error) {
      this.logger.error('Chat message error:', error);
    }
  }

  @SubscribeMessage('end_round')
  async handleEndRound(@ConnectedSocket() client: Socket) {
    try {
      const clientInfo = this.connectedClients.get(client.id);
      if (!clientInfo) return;

      const endRoundResult = await this.gameService.endRound(clientInfo.roomId);
      
      if ('gameStatus' in endRoundResult && endRoundResult.gameStatus === 'finished') {
        // Game is over
        this.server.to(clientInfo.roomId).emit('game_over', endRoundResult);
      } else {
        // Next round started
        this.server.to(clientInfo.roomId).emit('round_start', endRoundResult);
        
        // Send word to new drawer (type guard ensures this is the right type)
        if ('drawerUserId' in endRoundResult) {
          const drawerConnection = Array.from(this.connectedClients.values())
            .find(conn => conn.userId === endRoundResult.drawerUserId && conn.roomId === clientInfo.roomId);
          
          if (drawerConnection) {
            drawerConnection.socket.emit('drawer_word', {
              word: endRoundResult.word,
              topic: endRoundResult.topic,
            });
          }
        }
      }

    } catch (error) {
      this.logger.error('End round error:', error);
      client.emit('error', { message: error.message });
    }
  }

  @SubscribeMessage('force_end_game')
  async handleForceEndGame(@ConnectedSocket() client: Socket) {
    try {
      const clientInfo = this.connectedClients.get(client.id);
      if (!clientInfo) return;

      const gameResult = await this.gameService.endGame(clientInfo.roomId);
      this.server.to(clientInfo.roomId).emit('game_over', gameResult);

    } catch (error) {
      this.logger.error('Force end game error:', error);
      client.emit('error', { message: error.message });
    }
  }
}
