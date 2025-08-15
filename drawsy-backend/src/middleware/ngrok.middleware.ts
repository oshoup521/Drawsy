import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class NgrokMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Add headers for ngrok compatibility
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 
      'Content-Type, Authorization, Content-Length, X-Requested-With, ngrok-skip-browser-warning, Accept, Origin, X-Forwarded-For, X-Forwarded-Proto'
    );
    res.header('Access-Control-Expose-Headers', '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.status(200).send();
      return;
    }
    
    next();
  }
}
