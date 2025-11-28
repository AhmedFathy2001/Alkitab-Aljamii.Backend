import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

// Extend Express Request to include 'lang'
declare module 'express-serve-static-core' {
  interface Request {
    lang?: 'en' | 'ar';
  }
}

@Injectable()
export class I18nMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
    const langHeader = req.headers['x-lang'] as string;
    req.lang = langHeader === 'ar' ? 'ar' : 'en'; // default en
    next();
  }
}