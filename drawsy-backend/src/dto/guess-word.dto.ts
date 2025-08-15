import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GuessWordDto {
  @ApiProperty({ description: 'User ID making the guess' })
  @IsString()
  userId: string;

  @ApiProperty({ description: 'The guessed word' })
  @IsString()
  guess: string;
}
