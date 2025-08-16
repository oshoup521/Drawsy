import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { GameService } from '../services/game.service';
import { CreateGameDto } from '../dto/create-game.dto';
import { JoinGameDto } from '../dto/join-game.dto';

@ApiTags('health')
@Controller('api')
export class HealthController {
  @Get('health')
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  async healthCheck() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'drawsy-backend',
      environment: process.env.ENVIRONMENT || 'unknown',
    };
  }
}

@ApiTags('game')
@Controller('api/game')
export class GameController {
  constructor(private readonly gameService: GameService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new game room' })
  @ApiResponse({ status: 201, description: 'Game room created successfully' })
  async createGame(@Body() createGameDto: CreateGameDto) {
    return this.gameService.createGame(createGameDto);
  }

  @Post('join')
  @ApiOperation({ summary: 'Join an existing game room' })
  @ApiResponse({ status: 200, description: 'Successfully joined the game' })
  async joinGame(@Body() joinGameDto: JoinGameDto) {
    return this.gameService.joinGame(joinGameDto);
  }

  @Get(':roomId')
  @ApiOperation({ summary: 'Get current game state' })
  @ApiResponse({ status: 200, description: 'Game state retrieved successfully' })
  async getGameState(@Param('roomId') roomId: string) {
    return this.gameService.getGameState(roomId);
  }

  @Get(':roomId/scores')
  @ApiOperation({ summary: 'Get game scores' })
  @ApiResponse({ status: 200, description: 'Scores retrieved successfully' })
  async getScores(@Param('roomId') roomId: string) {
    return this.gameService.getScores(roomId);
  }

  @Post(':roomId/start')
  @ApiOperation({ summary: 'Start the game' })
  @ApiResponse({ status: 200, description: 'Game started successfully' })
  async startGame(@Param('roomId') roomId: string) {
    return this.gameService.startGame(roomId);
  }

  @Post(':roomId/next-drawer')
  @ApiOperation({ summary: 'Select next drawer for the round' })
  @ApiResponse({ status: 200, description: 'Next drawer selected successfully' })
  async selectNextDrawer(@Param('roomId') roomId: string) {
    return this.gameService.selectNextDrawer(roomId);
  }

  @Get(':roomId/random-drawer')
  @ApiOperation({ summary: 'Get a random drawer from active players' })
  @ApiResponse({ status: 200, description: 'Random drawer selected successfully' })
  async getRandomDrawer(@Param('roomId') roomId: string) {
    return this.gameService.getRandomDrawer(roomId);
  }

  @Post(':roomId/next-round')
  @ApiOperation({ summary: 'Start next round with new drawer and word' })
  @ApiResponse({ status: 200, description: 'Next round started successfully' })
  async startNextRound(@Param('roomId') roomId: string) {
    return this.gameService.startNextRound(roomId);
  }

  @Post(':roomId/end-round')
  @ApiOperation({ summary: 'End current round and proceed to next or finish game' })
  @ApiResponse({ status: 200, description: 'Round ended successfully' })
  async endRound(@Param('roomId') roomId: string) {
    return this.gameService.endRound(roomId);
  }

  @Post(':roomId/end-game')
  @ApiOperation({ summary: 'End the game and determine winner' })
  @ApiResponse({ status: 200, description: 'Game ended successfully' })
  async endGame(@Param('roomId') roomId: string) {
    return this.gameService.endGame(roomId);
  }

  @Post(':roomId/update-score/:userId')
  @ApiOperation({ summary: 'Update player score' })
  @ApiResponse({ status: 200, description: 'Score updated successfully' })
  async updatePlayerScore(
    @Param('roomId') roomId: string,
    @Param('userId') userId: string,
    @Body() body: { scoreToAdd: number }
  ) {
    return this.gameService.updatePlayerScore(roomId, userId, body.scoreToAdd);
  }
}
