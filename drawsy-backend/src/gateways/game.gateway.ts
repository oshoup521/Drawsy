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
import { SelectTopicDto } from '../dto/select-topic.dto';
import { SelectWordDto } from '../dto/select-word.dto';

interface ConnectedClient {
  socket: Socket;
  roomId: string;
  userId: string;
}

@WebSocketGateway({
  cors: {
    origin: [
      'http://localhost:3001',
      'http://localhost:3000',
      'https://crack-leading-feline.ngrok-free.app',
      'https://intent-knowing-ape.ngrok-free.app',
      /\.ngrok-free\.app$/,
      /\.ngrok\.io$/
    ],
    credentials: true,
    methods: ['GET', 'POST'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'ngrok-skip-browser-warning',
      'Accept',
      'Origin',
      'User-Agent'
    ],
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000,
})
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger = new Logger(GameGateway.name);
  private connectedClients = new Map<string, ConnectedClient>();
  private endRoundProcessing = new Set<string>(); // Track rooms currently processing end round

  constructor(
    private gameService: GameService,
    private llmService: LLMService,
  ) { }

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

      } catch (error) {
        // Fallback to generic name if player not found in DB
        client.to(roomId).emit('player_joined', {
          userId,
          name: 'Player',
        });
      }
    } catch (error) {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const clientInfo = this.connectedClients.get(client.id);
    if (clientInfo) {
      this.connectedClients.delete(client.id);

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

              // Also emit typing_stop in case they were typing when they left
              client.to(clientInfo.roomId).emit('typing_stop', {
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

              }

              // If the game ended because no players left
              if (removeResult.gameEnded) {
                this.server.to(clientInfo.roomId).emit('game_ended', {
                  reason: 'all_players_left'
                });

              }


            }
          } catch (error) {
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
      if (!clientInfo) {
        return;
      }

      const gameData = await this.gameService.startGame(clientInfo.roomId);

      // Broadcast game start to all players
      this.server.to(clientInfo.roomId).emit('game_started', gameData);

      // Send topic selection request only to the drawer
      const drawerConnections = Array.from(this.connectedClients.values())
        .filter(conn => conn.userId === gameData.drawerUserId && conn.roomId === clientInfo.roomId);

      // Send to all connections of the drawer (in case they have multiple tabs)
      drawerConnections.forEach(drawerConnection => {
        drawerConnection.socket.emit('request_topic_selection', {
          drawerUserId: gameData.drawerUserId,
          roundNumber: gameData.currentRound,
        });
      });

    } catch (error) {
      client.emit('error', { message: error.message });
    }
  }

  @SubscribeMessage('select_topic')
  async handleSelectTopic(
    @MessageBody() data: SelectTopicDto,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const clientInfo = this.connectedClients.get(client.id);
      if (!clientInfo) return;

      // Verify that the user is the current drawer
      const gameState = await this.gameService.getGameState(clientInfo.roomId);
      if (gameState.currentDrawerUserId !== clientInfo.userId) {
        client.emit('error', { message: 'Only the current drawer can select topics' });
        return;
      }

      const wordsData = await this.gameService.selectTopicAndGetWords(clientInfo.roomId, data.topic);

      // Send words only to the drawer for selection
      client.emit('topic_words', wordsData);

    } catch (error) {
      client.emit('error', { message: error.message });
    }
  }

  @SubscribeMessage('select_word')
  async handleSelectWord(
    @MessageBody() data: SelectWordDto,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const clientInfo = this.connectedClients.get(client.id);
      if (!clientInfo) {
        return;
      }

      // Verify that the user is the current drawer
      const gameState = await this.gameService.getGameState(clientInfo.roomId);
      if (gameState.currentDrawerUserId !== clientInfo.userId) {
        client.emit('error', { message: 'Only the current drawer can select words' });
        return;
      }

      const roundData = await this.gameService.selectWordAndStartRound(
        clientInfo.roomId,
        data.word,
        data.topic
      );

      // Broadcast round start to all players (without the word)
      const broadcastData = {
        ...roundData,
        word: undefined, // Don't send word to everyone
      };
      this.server.to(clientInfo.roomId).emit('round_started', broadcastData);

      // Send the word only to the drawer
      const drawerWordData = {
        word: roundData.word,
        topic: roundData.topic,
      };
      client.emit('drawer_word', drawerWordData);

    } catch (error) {
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

    try {
      // Verify that the user is the current drawer
      const gameState = await this.gameService.getGameState(clientInfo.roomId);
      const currentDrawer = gameState.players.find(p => p.userId === gameState.currentDrawerUserId);

      if (!currentDrawer || currentDrawer.userId !== clientInfo.userId) {
        return;
      }

      // Save drawing data to database
      await this.gameService.saveDrawingData(clientInfo.roomId, drawingData);

      // Broadcast drawing data to all other players in the room
      client.to(clientInfo.roomId).emit('drawing_data', drawingData);
    } catch (error) {
      // Still broadcast even if save fails to maintain real-time experience
      client.to(clientInfo.roomId).emit('drawing_data', drawingData);
    }
  }

  @SubscribeMessage('clear_canvas')
  async handleClearCanvas(@ConnectedSocket() client: Socket) {
    const clientInfo = this.connectedClients.get(client.id);
    if (!clientInfo) return;

    try {
      // Clear drawing data from database
      await this.gameService.clearDrawingData(clientInfo.roomId);

      // Broadcast clear canvas event to all other players in the room
      client.to(clientInfo.roomId).emit('clear_canvas');
    } catch (error) {
      // Still broadcast even if database clear fails
      client.to(clientInfo.roomId).emit('clear_canvas');
    }
  }

  @SubscribeMessage('load_drawing_data')
  async handleLoadDrawingData(@ConnectedSocket() client: Socket) {
    const clientInfo = this.connectedClients.get(client.id);
    if (!clientInfo) return;

    try {
      const drawingData = await this.gameService.getDrawingData(clientInfo.roomId);

      // Send drawing data only to the requesting client
      client.emit('drawing_data_loaded', drawingData);
    } catch (error) {
      client.emit('drawing_data_loaded', []);
    }
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
        return;
      }

      // Send chat message immediately for fast response
      const chatData = {
        userId: data.userId,
        message: data.message,
      };

      // Broadcast chat message to all players in the room immediately
      this.server.to(clientInfo.roomId).emit('chat_message', chatData);

      // Generate AI suggestions asynchronously in the background
      this.generateAISuggestionsAsync(data.message, clientInfo.roomId, data.userId);

    } catch (error) {
      // Chat message error occurred
    }
  }

  // Generate AI suggestions asynchronously without blocking chat messages
  private async generateAISuggestionsAsync(message: string, roomId: string, senderId: string) {
    try {
      console.log('Generating AI suggestions asynchronously for message:', message);
      const aiSuggestions = await this.llmService.generateChatSuggestion(message);
      
      if (aiSuggestions && aiSuggestions.length > 0) {
        // Only take first 2 suggestions to keep UI minimal
        const suggestions = aiSuggestions.slice(0, 2);
        console.log('AI suggestions generated:', suggestions);
        
        // Send AI suggestions as a separate event
        this.server.to(roomId).emit('ai_suggestions', {
          message,
          suggestions,
          senderId, // Include sender ID so frontend can filter appropriately
        });
      }
    } catch (error) {
      console.error('Failed to generate AI suggestions:', error);
      // Silently fail - chat functionality continues to work
    }
  }

  @SubscribeMessage('typing_start')
  async handleTypingStart(
    @MessageBody() data: { userId: string; name: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const clientInfo = this.connectedClients.get(client.id);
      if (!clientInfo) {
        return;
      }

      // Broadcast typing start to all other players in the room
      client.to(clientInfo.roomId).emit('typing_start', {
        userId: data.userId,
        name: data.name,
      });

    } catch (error) {
      // Typing start error occurred
    }
  }

  @SubscribeMessage('typing_stop')
  async handleTypingStop(
    @MessageBody() data: { userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const clientInfo = this.connectedClients.get(client.id);
      if (!clientInfo) {
        return;
      }

      // Broadcast typing stop to all other players in the room
      client.to(clientInfo.roomId).emit('typing_stop', {
        userId: data.userId,
      });

    } catch (error) {
      // Typing stop error occurred
    }
  }

  @SubscribeMessage('end_round')
  async handleEndRound(@ConnectedSocket() client: Socket) {
    try {
      const clientInfo = this.connectedClients.get(client.id);
      if (!clientInfo) return;

      // Prevent concurrent processing of end_round for the same room
      if (this.endRoundProcessing.has(clientInfo.roomId)) {
        console.log(`[END_ROUND] Already processing end round for room ${clientInfo.roomId}, ignoring duplicate request`);
        return;
      }

      // Mark this room as processing
      this.endRoundProcessing.add(clientInfo.roomId);

      try {
        // Get current game state to get the correct word
        const gameState = await this.gameService.getGameState(clientInfo.roomId);
        const correctWord = gameState.currentWord || 'Unknown';

        console.log(`[END_ROUND] Room: ${clientInfo.roomId}, Current Round: ${gameState.currentRound}, Max Rounds: ${gameState.numRounds}, Status: ${gameState.status}`);

        // Check if game is already finishing or finished to prevent duplicate processing
        if (gameState.status !== 'playing') {
          console.log(`[END_ROUND] Game not in playing state: ${gameState.status}, ignoring request`);
          return;
        }

        // Emit round ended event first
        this.server.to(clientInfo.roomId).emit('end_round', {
          correctWord,
          scores: gameState.players,
        });

        // Start next round - select next drawer and request topic selection
        const nextDrawerResult = await this.gameService.selectNextDrawer(clientInfo.roomId);
        
        console.log(`[END_ROUND] After selectNextDrawer - New Round: ${nextDrawerResult.roundNumber}, Max Rounds: ${gameState.numRounds}`);

        // Check if this is the last round AFTER incrementing the round
        if (nextDrawerResult.roundNumber > gameState.numRounds) {
          // Game should end
          console.log(`[END_ROUND] Game ending - Round ${nextDrawerResult.roundNumber} > Max ${gameState.numRounds}`);
          const gameResult = await this.gameService.endGame(clientInfo.roomId);
          this.server.to(clientInfo.roomId).emit('game_over', gameResult);
        } else {
          // Continue with next round
          console.log(`[END_ROUND] Continuing to round ${nextDrawerResult.roundNumber}`);
          
          // Double-check game state before sending next round events (in case of race conditions)
          const finalGameState = await this.gameService.getGameState(clientInfo.roomId);
          if (finalGameState.status !== 'playing') {
            console.log(`[END_ROUND] Game state changed to ${finalGameState.status}, aborting next round setup`);
            return;
          }
          
          // Clear canvas for everyone at the start of a new round
          try {
            await this.gameService.clearDrawingData(clientInfo.roomId);
            this.server.to(clientInfo.roomId).emit('clear_canvas');
            console.log(`[END_ROUND] Canvas cleared for new round ${nextDrawerResult.roundNumber}`);
          } catch (error) {
            console.error(`[END_ROUND] Failed to clear canvas for new round:`, error);
            // Still broadcast clear canvas event even if database clear fails
            this.server.to(clientInfo.roomId).emit('clear_canvas');
          }

          // Notify about next round starting
          this.server.to(clientInfo.roomId).emit('next_round_started', {
            currentRound: nextDrawerResult.roundNumber,
            drawerUserId: nextDrawerResult.currentDrawerUserId,
            drawerName: nextDrawerResult.drawerName,
            totalPlayers: nextDrawerResult.totalActivePlayers,
          });

          // Send topic selection request only to the new drawer
          const drawerConnections = Array.from(this.connectedClients.values())
            .filter(conn => conn.userId === nextDrawerResult.currentDrawerUserId && conn.roomId === clientInfo.roomId);

          console.log(`[END_ROUND] Sending topic selection to drawer ${nextDrawerResult.currentDrawerUserId}, found ${drawerConnections.length} connections`);

          // Send to all connections of the new drawer (in case they have multiple tabs)
          drawerConnections.forEach(drawerConnection => {
            drawerConnection.socket.emit('request_topic_selection', {
              drawerUserId: nextDrawerResult.currentDrawerUserId,
              roundNumber: nextDrawerResult.roundNumber,
            });
          });
        }
      } finally {
        // Always remove the processing flag
        this.endRoundProcessing.delete(clientInfo.roomId);
      }

    } catch (error) {
      console.error('[END_ROUND] Error:', error);
      // Make sure to remove processing flag on error
      const clientInfo = this.connectedClients.get(client.id);
      if (clientInfo) {
        this.endRoundProcessing.delete(clientInfo.roomId);
      }
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
      client.emit('error', { message: error.message });
    }
  }
}
