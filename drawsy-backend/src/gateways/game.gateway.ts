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
      if (!clientInfo) {
        this.logger.error('No client info found for start_game request');
        return;
      }

      this.logger.log(`Start game request from ${clientInfo.userId} in room ${clientInfo.roomId}`);
      const gameData = await this.gameService.startGame(clientInfo.roomId);
      this.logger.log('Game started successfully:', gameData);

      // Broadcast game start to all players
      this.logger.log(`Broadcasting game_started to room ${clientInfo.roomId}:`, gameData);
      this.server.to(clientInfo.roomId).emit('game_started', gameData);

      // Send topic selection request to the drawer
      const drawerConnection = Array.from(this.connectedClients.values())
        .find(conn => conn.userId === gameData.drawerUserId && conn.roomId === clientInfo.roomId);

      if (drawerConnection) {
        this.logger.log(`Sending topic selection request to drawer ${gameData.drawerUserId}`);
        drawerConnection.socket.emit('request_topic_selection', {
          drawerUserId: gameData.drawerUserId,
          roundNumber: gameData.currentRound,
        });
      } else {
        this.logger.warn(`Drawer connection not found for user ${gameData.drawerUserId}`);
      }

    } catch (error) {
      this.logger.error('Start game error:', error);
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

      const wordsData = await this.gameService.selectTopicAndGetWords(clientInfo.roomId, data.topic);

      // Send words to the drawer for selection
      client.emit('topic_words', wordsData);

    } catch (error) {
      this.logger.error('Select topic error:', error);
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
        this.logger.error('No client info found for select_word request');
        return;
      }

      this.logger.log(`Word selection from ${clientInfo.userId} in room ${clientInfo.roomId}:`, data);
      const roundData = await this.gameService.selectWordAndStartRound(
        clientInfo.roomId,
        data.word,
        data.topic
      );
      this.logger.log('Round data prepared:', roundData);

      // Broadcast round start to all players (without the word)
      const broadcastData = {
        ...roundData,
        word: undefined, // Don't send word to everyone
      };
      this.logger.log(`Broadcasting round_started to room ${clientInfo.roomId}:`, broadcastData);
      this.server.to(clientInfo.roomId).emit('round_started', broadcastData);

      // Send the word only to the drawer
      const drawerWordData = {
        word: roundData.word,
        topic: roundData.topic,
      };
      this.logger.log(`Sending drawer_word to drawer:`, drawerWordData);
      client.emit('drawer_word', drawerWordData);

    } catch (error) {
      this.logger.error('Select word error:', error);
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
        this.logger.warn(`Non-drawer ${clientInfo.userId} attempted to draw in room ${clientInfo.roomId}`);
        return;
      }

      // Save drawing data to database
      await this.gameService.saveDrawingData(clientInfo.roomId, drawingData);

      // Broadcast drawing data to all other players in the room
      client.to(clientInfo.roomId).emit('drawing_data', drawingData);
    } catch (error) {
      this.logger.error('Error saving drawing data:', error);
      // Still broadcast even if save fails to maintain real-time experience
      client.to(clientInfo.roomId).emit('drawing_data', drawingData);
    }
  }

  @SubscribeMessage('clear_canvas')
  async handleClearCanvas(@ConnectedSocket() client: Socket) {
    const clientInfo = this.connectedClients.get(client.id);
    if (!clientInfo) return;

    this.logger.log(`Clear canvas request from ${clientInfo.userId} in room ${clientInfo.roomId}`);

    try {
      // Clear drawing data from database
      await this.gameService.clearDrawingData(clientInfo.roomId);

      // Broadcast clear canvas event to all other players in the room
      client.to(clientInfo.roomId).emit('clear_canvas');
    } catch (error) {
      this.logger.error('Error clearing drawing data:', error);
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
      this.logger.error('Error loading drawing data:', error);
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

      this.logger.log(`End round request from ${clientInfo.userId} in room ${clientInfo.roomId}`);

      // Get current game state to get the correct word
      const gameState = await this.gameService.getGameState(clientInfo.roomId);
      const correctWord = gameState.currentWord || 'Unknown';

      // End the current round
      const endRoundResult = await this.gameService.endRound(clientInfo.roomId);

      if ('gameStatus' in endRoundResult && endRoundResult.gameStatus === 'finished') {
        // Game is over
        this.logger.log(`Game finished in room ${clientInfo.roomId}`);
        this.server.to(clientInfo.roomId).emit('game_over', endRoundResult);
      } else {
        // Emit round ended event first
        this.server.to(clientInfo.roomId).emit('end_round', {
          correctWord,
          scores: gameState.players,
        });

        // Wait a moment then start next round
        setTimeout(async () => {
          try {
            // Check if this was the last round
            if (gameState.currentRound >= gameState.numRounds) {
              // Game should end
              const gameResult = await this.gameService.endGame(clientInfo.roomId);
              this.server.to(clientInfo.roomId).emit('game_over', gameResult);
            } else {
              // Start next round - select next drawer and request topic selection
              const nextDrawerResult = await this.gameService.selectNextDrawer(clientInfo.roomId);

              // Notify about next round starting
              this.server.to(clientInfo.roomId).emit('game_started', {
                currentRound: gameState.currentRound + 1,
                drawerUserId: nextDrawerResult.currentDrawerUserId,
                drawerName: nextDrawerResult.drawerName,
                totalPlayers: nextDrawerResult.totalActivePlayers,
              });

              // Send topic selection request to new drawer
              const drawerConnection = Array.from(this.connectedClients.values())
                .find(conn => conn.userId === nextDrawerResult.currentDrawerUserId && conn.roomId === clientInfo.roomId);

              if (drawerConnection) {
                drawerConnection.socket.emit('request_topic_selection', {
                  drawerUserId: nextDrawerResult.currentDrawerUserId,
                  roundNumber: gameState.currentRound + 1,
                });
              }
            }
          } catch (error) {
            this.logger.error('Error starting next round:', error);
          }
        }, 2000); // 2 second delay to show round end results
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
