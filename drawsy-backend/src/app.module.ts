import { Module, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseModule } from './database/database.module';
import { GameController, HealthController } from './controllers/game.controller';
import { GameService } from './services/game.service';
import { LLMService } from './services/llm.service';
import { GameGateway } from './gateways/game.gateway';
import { NgrokMiddleware } from './middleware/ngrok.middleware';
import { Game } from './entities/game.entity';
import { Player } from './entities/player.entity';
import { Round } from './entities/round.entity';
import { DrawingData } from './entities/drawing-data.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    TypeOrmModule.forFeature([Game, Player, Round, DrawingData]),
  ],
  controllers: [GameController, HealthController],
  providers: [GameService, LLMService, GameGateway],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(NgrokMiddleware)
      .forRoutes('*'); // Apply to all routes
  }
}
