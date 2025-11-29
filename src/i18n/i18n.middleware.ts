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
    // Check x-lang header first, then Accept-Language
    const xLang = req.headers['x-lang'] as string | undefined;
    const acceptLang = req.headers['accept-language'] as string | undefined;

    // Parse Accept-Language (e.g., "ar" or "ar,en;q=0.9")
    const lang = xLang || acceptLang?.split(',')[0]?.split('-')[0];
    req.lang = lang === 'ar' ? 'ar' : 'en'; // default en
    next();
  }
}