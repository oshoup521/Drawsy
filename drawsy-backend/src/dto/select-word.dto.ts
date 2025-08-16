import { IsString, IsNotEmpty } from 'class-validator';

export class SelectWordDto {
  @IsString()
  @IsNotEmpty()
  word: string;

  @IsString()
  @IsNotEmpty()
  topic: string;
}