import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Game, GameStatus } from '../entities/game.entity';
import { Player } from '../entities/player.entity';
import { Round } from '../entities/round.entity';
import { DrawingData } from '../entities/drawing-data.entity';
import { CreateGameDto } from '../dto/create-game.dto';
import { JoinGameDto } from '../dto/join-game.dto';
import { DrawingDataDto } from '../dto/drawing-data.dto';
import { LLMService } from './llm.service';

@Injectable()
export class GameService {
  constructor(
    @InjectRepository(Game)
    private gameRepository: Repository<Game>,
    @InjectRepository(Player)
    private playerRepository: Repository<Player>,
    @InjectRepository(Round)
    private roundRepository: Repository<Round>,
    @InjectRepository(DrawingData)
    private drawingDataRepository: Repository<DrawingData>,
    private llmService: LLMService,
  ) { }

  async createGame(createGameDto: CreateGameDto) {
    const roomId = this.generateRoomId();
    const hostUserId = uuidv4();

    const game = this.gameRepository.create({
      roomId,
      playerCount: createGameDto.playerCount,
      guessTime: createGameDto.guessTime,
      numRounds: createGameDto.numRounds,
      hostUserId,
      status: GameStatus.WAITING,
    });

    const savedGame = await this.gameRepository.save(game);

    // Create host player
    const hostPlayer = this.playerRepository.create({
      userId: hostUserId,
      name: createGameDto.hostName,
      gameId: savedGame.id,
      isHost: true,
    });

    await this.playerRepository.save(hostPlayer);

    return {
      roomId,
      gameId: savedGame.id,
      hostUserId,
    };
  }

  async joinGame(joinGameDto: JoinGameDto) {
    const game = await this.gameRepository.findOne({
      where: { roomId: joinGameDto.roomId },
      relations: ['players'],
    });

    if (!game) {
      throw new NotFoundException('Game not found');
    }

    if (game.status !== GameStatus.WAITING) {
      throw new BadRequestException('Game has already started');
    }

    if (game.players.length >= game.playerCount) {
      throw new BadRequestException('Game is full');
    }

    const userId = uuidv4();
    const player = this.playerRepository.create({
      userId,
      name: joinGameDto.name,
      gameId: game.id,
      isHost: false,
    });

    await this.playerRepository.save(player);

    return {
      userId,
      roomId: game.roomId,
      gameId: game.id,
    };
  }

  async getGameState(roomId: string) {
    const game = await this.gameRepository.findOne({
      where: { roomId },
      relations: ['players'],
    });

    if (!game) {
      throw new NotFoundException('Game not found');
    }

    return {
      roomId: game.roomId,
      playerCount: game.playerCount,
      guessTime: game.guessTime,
      numRounds: game.numRounds,
      players: game.players.map(player => ({
        userId: player.userId,
        name: player.name,
        score: player.score,
        isHost: player.isHost,
        isActive: player.isActive,
      })),
      currentRound: game.currentRound,
      currentDrawerUserId: game.currentDrawerUserId,
      currentWord: game.currentWord,
      wordLength: game.wordLength,
      status: game.status,
    };
  }

  async getPlayer(roomId: string, userId: string) {
    const game = await this.gameRepository.findOne({
      where: { roomId },
      relations: ['players'],
    });

    if (!game) {
      throw new NotFoundException('Game not found');
    }

    const player = game.players.find(p => p.userId === userId);
    if (!player) {
      throw new NotFoundException('Player not found');
    }

    return {
      userId: player.userId,
      name: player.name,
      score: player.score,
      isHost: player.isHost,
      isActive: player.isActive,
    };
  }

  async getScores(roomId: string) {
    const game = await this.gameRepository.findOne({
      where: { roomId },
      relations: ['players'],
    });

    if (!game) {
      throw new NotFoundException('Game not found');
    }

    return game.players
      .sort((a, b) => b.score - a.score)
      .map(player => ({
        userId: player.userId,
        name: player.name,
        score: player.score,
      }));
  }

  async startGame(roomId: string) {
    const game = await this.gameRepository.findOne({
      where: { roomId },
      relations: ['players'],
    });

    if (!game) {
      throw new NotFoundException('Game not found');
    }

    if (game.status !== GameStatus.WAITING) {
      throw new BadRequestException('Game has already started');
    }

    if (game.players.length < 2) {
      throw new BadRequestException('Need at least 2 players to start');
    }

    // Select random drawer from active players
    const activePlayers = game.players.filter(p => p.isActive === true);
    if (activePlayers.length === 0) {
      throw new BadRequestException('No active players found');
    }
    const randomIndex = Math.floor(Math.random() * activePlayers.length);
    const firstDrawer = activePlayers[randomIndex];

    game.status = GameStatus.PLAYING;
    game.currentRound = 1;
    game.currentDrawerUserId = firstDrawer.userId;
    game.usedDrawers = [firstDrawer.userId]; // Initialize used drawers list
    // Don't set word yet - drawer will select topic first

    await this.gameRepository.save(game);

    return {
      currentRound: game.currentRound,
      drawerUserId: game.currentDrawerUserId,
      drawerName: firstDrawer.name,
      totalPlayers: activePlayers.length,
    };
  }

  async selectTopicAndGetWords(roomId: string, topic: string) {
    const game = await this.gameRepository.findOne({
      where: { roomId },
      relations: ['players'],
    });

    if (!game) {
      throw new NotFoundException('Game not found');
    }

    if (game.status !== GameStatus.PLAYING) {
      throw new BadRequestException('Game is not in playing state');
    }

    // Get words for the selected topic
    const wordsData = await this.llmService.generateWordsByTopic(topic);

    // Only return fallback words if AI words are not available
    const response = {
      topic,
      drawerUserId: game.currentDrawerUserId,
      aiWords: wordsData.aiWords,
      fallbackWords: wordsData.aiWords.length > 0 ? [] : wordsData.fallbackWords, // Only provide fallback if AI failed
    };

    return response;
  }

  async selectWordAndStartRound(roomId: string, word: string, topic: string) {
    const game = await this.gameRepository.findOne({
      where: { roomId },
      relations: ['players'],
    });

    if (!game) {
      throw new NotFoundException('Game not found');
    }

    if (game.status !== GameStatus.PLAYING) {
      throw new BadRequestException('Game is not in playing state');
    }

    // Update game with selected word and reset correct guessers for new round
    game.currentWord = word;
    game.wordLength = word.length;
    game.correctGuessers = []; // Reset correct guessers for new round
    await this.gameRepository.save(game);

    // Create round record
    const round = this.roundRepository.create({
      roundNumber: game.currentRound,
      drawerUserId: game.currentDrawerUserId,
      word: word,
      topic: topic,
      gameId: game.id,
    });

    await this.roundRepository.save(round);

    return {
      roundNumber: game.currentRound,
      drawerUserId: game.currentDrawerUserId,
      word: word,
      topic: topic,
      wordLength: word.length,
      guessTime: game.guessTime,
    };
  }

  async checkGuess(roomId: string, userId: string, guess: string) {
    const game = await this.gameRepository.findOne({
      where: { roomId },
      relations: ['players'],
    });

    if (!game || !game.currentWord) {
      throw new NotFoundException('Game not found or no active word');
    }

    const player = game.players.find(p => p.userId === userId);
    if (!player) {
      throw new NotFoundException('Player not found');
    }

    // Check if player has already guessed correctly in this round
    const correctGuessers = game.correctGuessers || [];
    const hasAlreadyGuessedCorrectly = correctGuessers.includes(userId);

    if (hasAlreadyGuessedCorrectly) {
      return {
        userId,
        playerName: player.name,
        guess,
        correct: false,
        funnyResponse: "You've already guessed correctly! Let others have a chance! 😊",
        scoreAwarded: 0,
        alreadyGuessedCorrectly: true,
      };
    }

    const isCorrect = guess.toLowerCase().trim() === game.currentWord.toLowerCase().trim();

    let funnyResponse = '';
    if (!isCorrect) {
      funnyResponse = await this.llmService.generateFunnyResponse(guess, game.currentWord);
    }

    if (isCorrect) {
      // Award points
      player.score += 50;
      await this.playerRepository.save(player);

      // Add player to correct guessers list
      game.correctGuessers = [...correctGuessers, userId];
      await this.gameRepository.save(game);
    }

    return {
      userId,
      playerName: player.name,
      guess,
      correct: isCorrect,
      funnyResponse,
      scoreAwarded: isCorrect ? 50 : 0,
      alreadyGuessedCorrectly: false,
    };
  }

  async selectNextDrawer(roomId: string) {
    const game = await this.gameRepository.findOne({
      where: { roomId },
      relations: ['players'],
    });

    if (!game) {
      throw new NotFoundException('Game not found');
    }

    if (game.status !== GameStatus.PLAYING) {
      throw new BadRequestException('Game is not in playing state');
    }

    // Get active players
    const activePlayers = game.players.filter(p => p.isActive);

    if (activePlayers.length < 2) {
      throw new BadRequestException('Need at least 2 active players');
    }

    const usedDrawers = game.usedDrawers || [];

    // Find players who haven't been drawers yet
    const unusedDrawers = activePlayers.filter(p => !usedDrawers.includes(p.userId));

    let nextDrawer;

    if (unusedDrawers.length > 0) {
      // Select from unused drawers first
      const randomIndex = Math.floor(Math.random() * unusedDrawers.length);
      nextDrawer = unusedDrawers[randomIndex];
    } else {
      // All players have been drawers, reset the cycle and exclude current drawer
      const availableDrawers = activePlayers.filter(p => p.userId !== game.currentDrawerUserId);

      if (availableDrawers.length === 0) {
        // Only one player, they have to be drawer again
        nextDrawer = activePlayers[0];
        game.usedDrawers = [nextDrawer.userId];
      } else {
        // Reset used drawers and select from available ones
        const randomIndex = Math.floor(Math.random() * availableDrawers.length);
        nextDrawer = availableDrawers[randomIndex];
        game.usedDrawers = [nextDrawer.userId];
      }
    }

    // Add the new drawer to used drawers list if not resetting
    if (unusedDrawers.length > 0) {
      game.usedDrawers = [...usedDrawers, nextDrawer.userId];
    }

    // Increment round and update game with new drawer
    const previousDrawerUserId = game.currentDrawerUserId;
    game.currentRound += 1;
    game.currentDrawerUserId = nextDrawer.userId;
    game.currentWord = null; // Clear previous word
    game.wordLength = null; // Clear previous word length
    game.correctGuessers = []; // Reset correct guessers for new round
    await this.gameRepository.save(game);

    return {
      previousDrawerUserId,
      currentDrawerUserId: nextDrawer.userId,
      drawerName: nextDrawer.name,
      totalActivePlayers: activePlayers.length,
      roundNumber: game.currentRound,
    };
  }

  async getRandomDrawer(roomId: string) {
    const game = await this.gameRepository.findOne({
      where: { roomId },
      relations: ['players'],
    });

    if (!game) {
      throw new NotFoundException('Game not found');
    }

    // Get active players excluding current drawer (if any)
    const activePlayers = game.players.filter(p => p.isActive && p.userId !== game.currentDrawerUserId);

    if (activePlayers.length === 0) {
      // If no other players, include current drawer
      const allActivePlayers = game.players.filter(p => p.isActive);
      if (allActivePlayers.length === 0) {
        throw new BadRequestException('No active players found');
      }
      activePlayers.push(...allActivePlayers);
    }

    // Select random drawer
    const randomIndex = Math.floor(Math.random() * activePlayers.length);
    const randomDrawer = activePlayers[randomIndex];

    return {
      drawerId: randomDrawer.userId,
      drawerName: randomDrawer.name,
      totalActivePlayers: game.players.filter(p => p.isActive).length,
      availableDrawers: activePlayers.length,
    };
  }

  async startNextRound(roomId: string) {
    const game = await this.gameRepository.findOne({
      where: { roomId },
      relations: ['players'],
    });

    if (!game) {
      throw new NotFoundException('Game not found');
    }

    if (game.status !== GameStatus.PLAYING) {
      throw new BadRequestException('Game is not in playing state');
    }

    // Check if we've reached max rounds
    if (game.currentRound >= game.numRounds) {
      throw new BadRequestException('Game has reached maximum rounds');
    }

    // Get active players
    const activePlayers = game.players.filter(p => p.isActive);

    if (activePlayers.length < 2) {
      throw new BadRequestException('Need at least 2 active players');
    }

    // Select next drawer (circular rotation)
    const currentDrawerIndex = activePlayers.findIndex(p => p.userId === game.currentDrawerUserId);
    const nextDrawerIndex = (currentDrawerIndex + 1) % activePlayers.length;
    const nextDrawer = activePlayers[nextDrawerIndex];

    // Generate new word for the round
    const wordSuggestion = await this.llmService.generateWordSuggestion();

    // Update game state
    game.currentRound += 1;
    game.currentDrawerUserId = nextDrawer.userId;
    game.currentWord = wordSuggestion.word;
    game.wordLength = wordSuggestion.word.length;
    game.correctGuessers = []; // Reset correct guessers for new round

    await this.gameRepository.save(game);

    // Create new round record
    const round = this.roundRepository.create({
      roundNumber: game.currentRound,
      drawerUserId: nextDrawer.userId,
      word: wordSuggestion.word,
      topic: wordSuggestion.topic,
      gameId: game.id,
    });

    await this.roundRepository.save(round);

    return {
      roundNumber: game.currentRound,
      drawerUserId: game.currentDrawerUserId,
      drawerName: nextDrawer.name,
      wordLength: game.wordLength,
      topic: wordSuggestion.topic,
      totalRounds: game.numRounds,

    };
  }



  async endRound(roomId: string) {
    // This method is kept for API compatibility but logic is handled in gateway
    return { success: true };
  }

  async endGame(roomId: string) {
    const game = await this.gameRepository.findOne({
      where: { roomId },
      relations: ['players'],
    });

    if (!game) {
      throw new NotFoundException('Game not found');
    }

    // Set game status to finished
    game.status = GameStatus.FINISHED;
    await this.gameRepository.save(game);

    // Find winner (player with highest score)
    const winner = game.players.reduce((prev, current) =>
      (prev.score > current.score) ? prev : current
    );

    return {
      gameStatus: 'finished',
      winner: {
        userId: winner.userId,
        name: winner.name,
        score: winner.score,
      },
      finalScores: game.players
        .sort((a, b) => b.score - a.score)
        .map(p => ({
          userId: p.userId,
          name: p.name,
          score: p.score,
        })),
    };
  }

  async updatePlayerScore(roomId: string, userId: string, scoreToAdd: number) {
    const game = await this.gameRepository.findOne({
      where: { roomId },
      relations: ['players'],
    });

    if (!game) {
      throw new NotFoundException('Game not found');
    }

    const player = game.players.find(p => p.userId === userId);
    if (!player) {
      throw new NotFoundException('Player not found');
    }

    player.score += scoreToAdd;
    await this.playerRepository.save(player);

    return {
      userId: player.userId,
      name: player.name,
      newScore: player.score,
      scoreAdded: scoreToAdd,
    };
  }

  async removePlayer(roomId: string, userId: string) {
    const game = await this.gameRepository.findOne({
      where: { roomId },
      relations: ['players'],
    });

    if (!game) {
      throw new NotFoundException('Game not found');
    }

    const player = game.players.find(p => p.userId === userId);
    if (!player) {
      // Player not found, nothing to remove
      return null;
    }

    const wasHost = player.isHost;

    // Remove the player
    await this.playerRepository.remove(player);

    // If the host left and there are other players, assign a new host
    if (wasHost) {
      const remainingPlayers = await this.playerRepository.find({
        where: { gameId: game.id },
      });

      if (remainingPlayers.length > 0) {
        // Pick a random player to be the new host
        const randomIndex = Math.floor(Math.random() * remainingPlayers.length);
        const newHost = remainingPlayers[randomIndex];

        // Update the new host
        newHost.isHost = true;
        await this.playerRepository.save(newHost);

        // Update the game's hostUserId
        game.hostUserId = newHost.userId;
        await this.gameRepository.save(game);

        return {
          playerRemoved: {
            userId: player.userId,
            name: player.name,
            wasHost: true,
          },
          newHost: {
            userId: newHost.userId,
            name: newHost.name,
          },
          remainingPlayerCount: remainingPlayers.length,
        };
      } else {
        // No remaining players, game should be deleted or marked as finished
        game.status = GameStatus.FINISHED;
        await this.gameRepository.save(game);

        return {
          playerRemoved: {
            userId: player.userId,
            name: player.name,
            wasHost: true,
          },
          newHost: null,
          remainingPlayerCount: 0,
          gameEnded: true,
        };
      }
    }

    // Regular player left, not the host
    const remainingPlayers = await this.playerRepository.find({
      where: { gameId: game.id },
    });

    return {
      playerRemoved: {
        userId: player.userId,
        name: player.name,
        wasHost: false,
      },
      newHost: null,
      remainingPlayerCount: remainingPlayers.length,
    };
  }

  async saveDrawingData(roomId: string, drawingDataDto: DrawingDataDto) {
    const game = await this.gameRepository.findOne({
      where: { roomId },
      relations: ['rounds'],
    });

    if (!game) {
      throw new NotFoundException('Game not found');
    }

    // Get the current round
    const currentRound = game.rounds?.find(r => r.roundNumber === game.currentRound);
    if (!currentRound) {
      throw new NotFoundException('Current round not found');
    }

    const drawingData = this.drawingDataRepository.create({
      x: drawingDataDto.x,
      y: drawingDataDto.y,
      color: drawingDataDto.color,
      lineWidth: drawingDataDto.lineWidth,
      strokeId: drawingDataDto.strokeId,
      isDrawing: drawingDataDto.isDrawing,
      roundId: currentRound.id,
    });

    return await this.drawingDataRepository.save(drawingData);
  }

  async getDrawingData(roomId: string) {
    const game = await this.gameRepository.findOne({
      where: { roomId },
      relations: ['rounds', 'rounds.drawingData'],
    });

    if (!game) {
      throw new NotFoundException('Game not found');
    }

    // Get drawing data for the current round
    const currentRound = game.rounds?.find(r => r.roundNumber === game.currentRound);
    if (!currentRound) {
      return [];
    }

    return currentRound.drawingData
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()) // Sort by creation time
      .map(data => ({
        x: data.x,
        y: data.y,
        color: data.color,
        lineWidth: data.lineWidth,
        strokeId: data.strokeId,
        isDrawing: data.isDrawing,
      }));
  }

  async clearDrawingData(roomId: string) {
    const game = await this.gameRepository.findOne({
      where: { roomId },
      relations: ['rounds'],
    });

    if (!game) {
      throw new NotFoundException('Game not found');
    }

    // Get the current round
    const currentRound = game.rounds?.find(r => r.roundNumber === game.currentRound);
    if (!currentRound) {
      throw new NotFoundException('Current round not found');
    }

    // Delete all drawing data for the current round
    await this.drawingDataRepository.delete({ roundId: currentRound.id });
  }

  private generateRoomId(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }
}
