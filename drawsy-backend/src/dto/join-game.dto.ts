import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class JoinGameDto {
  @ApiProperty({ description: 'Room ID to join' })
  @IsString()
  roomId: string;

  @ApiProperty({ description: 'Player name' })
  @IsString()
  name: string;
}
