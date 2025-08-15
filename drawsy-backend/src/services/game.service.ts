import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Game, GameStatus } from '../entities/game.entity';
import { Player } from '../entities/player.entity';
import { Round } from '../entities/round.entity';
import { CreateGameDto } from '../dto/create-game.dto';
import { JoinGameDto } from '../dto/join-game.dto';
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
    private llmService: LLMService,
  ) {}

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

    // Select first drawer (host)
    const firstDrawer = game.players.find(p => p.isHost) || game.players[0];
    
    // Generate word for first round
    const wordSuggestion = await this.llmService.generateWordSuggestion();
    
    game.status = GameStatus.PLAYING;
    game.currentRound = 1; // Start with round 1
    game.currentDrawerUserId = firstDrawer.userId;
    game.currentWord = wordSuggestion.word;
    game.wordLength = wordSuggestion.word.length;

    await this.gameRepository.save(game);

    // Create first round
    const round = this.roundRepository.create({
      roundNumber: 1,
      drawerUserId: firstDrawer.userId,
      word: wordSuggestion.word,
      topic: wordSuggestion.topic,
      gameId: game.id,
    });

    await this.roundRepository.save(round);

    return {
      currentRound: game.currentRound,
      drawerUserId: game.currentDrawerUserId,
      wordLength: game.wordLength,
      topic: wordSuggestion.topic,
      currentWord: game.currentWord,
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

    const isCorrect = guess.toLowerCase().trim() === game.currentWord.toLowerCase().trim();
    
    let funnyResponse = '';
    if (!isCorrect) {
      funnyResponse = await this.llmService.generateFunnyResponse(guess, game.currentWord);
    }

    if (isCorrect) {
      // Award points
      player.score += 50;
      await this.playerRepository.save(player);
    }

    return {
      userId,
      playerName: player.name,
      guess,
      correct: isCorrect,
      funnyResponse,
      scoreAwarded: isCorrect ? 50 : 0,
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

    // Find current drawer index
    const currentDrawerIndex = activePlayers.findIndex(p => p.userId === game.currentDrawerUserId);
    
    // Select next drawer (circular rotation)
    const nextDrawerIndex = (currentDrawerIndex + 1) % activePlayers.length;
    const nextDrawer = activePlayers[nextDrawerIndex];

    // Update game with new drawer
    game.currentDrawerUserId = nextDrawer.userId;
    await this.gameRepository.save(game);

    return {
      previousDrawerUserId: activePlayers[currentDrawerIndex]?.userId,
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
      word: wordSuggestion.word, // Only return for debugging, remove in production
    };
  }

  async endRound(roomId: string) {
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

    // Check if this was the last round
    if (game.currentRound >= game.numRounds) {
      return this.endGame(roomId);
    }

    // Otherwise, start next round
    return this.startNextRound(roomId);
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

  private generateRoomId(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }
}
