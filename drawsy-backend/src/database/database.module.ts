import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Game } from '../entities/game.entity';
import { Player } from '../entities/player.entity';
import { Round } from '../entities/round.entity';
import { DrawingData } from '../entities/drawing-data.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST') || 'localhost',
        port: parseInt(configService.get('DB_PORT')) || 5432,
        username: configService.get('DB_USERNAME') || 'postgres',
        password: configService.get('DB_PASSWORD') || 'password',
        database: configService.get('DB_DATABASE') || 'drawsy',
        entities: [Game, Player, Round, DrawingData],
        synchronize: configService.get('NODE_ENV') === 'development',
        logging: false, // Disable SQL query logging for cleaner console output
      }),
      inject: [ConfigService],
    }),
  ],
})
export class DatabaseModule {}
