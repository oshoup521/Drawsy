import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { CorsConfigService } from './services/cors-config.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Get CORS configuration service
  const corsConfigService = new CorsConfigService();
  
  // Enable dynamic CORS - automatically handles localhost and ngrok
  app.enableCors(corsConfigService.getCorsOptions());

  // Enable validation pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
  }));

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('Drawsy API')
    .setDescription('REST API for Drawsy game')
    .setVersion('1.0')
    .addTag('game')
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  
  console.log(`🚀 Server running on http://localhost:${port}`);
  console.log(`📚 Swagger docs available at http://localhost:${port}/api/docs`);
}

bootstrap();
