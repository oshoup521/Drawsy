import { IsNumber, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DrawingDataDto {
  @ApiProperty({ description: 'X coordinate' })
  @IsNumber()
  x: number;

  @ApiProperty({ description: 'Y coordinate' })
  @IsNumber()
  y: number;

  @ApiProperty({ description: 'Color in hex format' })
  @IsString()
  color: string;

  @ApiProperty({ description: 'Line width' })
  @IsNumber()
  lineWidth: number;

  @ApiProperty({ description: 'Stroke ID for grouping', required: false })
  @IsString()
  strokeId?: string;
}
