import { IsString, IsNotEmpty } from 'class-validator';

export class SelectTopicDto {
  @IsString()
  @IsNotEmpty()
  topic: string;
}