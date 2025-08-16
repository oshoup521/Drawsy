import { Injectable } from '@nestjs/common';

@Injectable()
export class CorsConfigService {
  private getAllowedOrigins(): string[] {
    const corsOrigins = process.env.CORS_ORIGINS;
    
    // Base origins that should always be allowed
    const baseOrigins = [
      'http://localhost:3001',
      'http://localhost:3000',
      'http://127.0.0.1:3001',
      'http://127.0.0.1:3000',
    ];

    // Add configured origins from environment
    if (corsOrigins) {
      const envOrigins = corsOrigins.split(',').map(origin => origin.trim());
      baseOrigins.push(...envOrigins);
    }

    // Add common ngrok patterns (these will be updated dynamically)
    const ngrokPatterns = [
      'https://crack-leading-feline.ngrok-free.app',
      'https://intent-knowing-ape.ngrok-free.app',
    ];
    baseOrigins.push(...ngrokPatterns);

    // Remove duplicates
    return [...new Set(baseOrigins)];
  }

  getCorsOptions() {
    const allowedOrigins = this.getAllowedOrigins();
    
    return {
      origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        // Check if origin is in allowed list
        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        
        // Allow any localhost origin (for development)
        if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
          return callback(null, true);
        }
        
        // Allow any ngrok origin
        if (origin.includes('ngrok') || origin.includes('ngrok-free.app')) {
          return callback(null, true);
        }
        
        console.log('🚫 CORS blocked origin:', origin);
        console.log('✅ Allowed origins:', allowedOrigins);
        
        // For development, allow all origins (remove in production)
        if (process.env.NODE_ENV === 'development') {
          return callback(null, true);
        }
        
        callback(new Error('Not allowed by CORS'));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'ngrok-skip-browser-warning',
        'Accept',
        'Origin',
        'X-Forwarded-For',
        'X-Forwarded-Proto',
      ],
      exposedHeaders: ['*'],
    };
  }
}
