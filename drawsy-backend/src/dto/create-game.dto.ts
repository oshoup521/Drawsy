import { IsNumber, IsString, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateGameDto {
  @ApiProperty({ description: 'Number of players in the game', minimum: 2, maximum: 20 })
  @IsNumber()
  @Min(2)
  @Max(20)
  playerCount: number;

  @ApiProperty({ description: 'Time limit for guessing in seconds', minimum: 30, maximum: 300 })
  @IsNumber()
  @Min(30)
  @Max(300)
  guessTime: number;

  @ApiProperty({ description: 'Number of rounds to play', minimum: 1, maximum: 10 })
  @IsNumber()
  @Min(1)
  @Max(10)
  numRounds: number;

  @ApiProperty({ description: 'Name of the host player' })
  @IsString()
  hostName: string;
}
