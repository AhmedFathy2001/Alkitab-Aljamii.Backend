import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { JwtConfig } from '../../config/configuration.js';
import type { Request } from 'express';

export interface JwtPayload {
  sub: string;
  email: string;
  isSuperAdmin: boolean;
  // Context fields - set when user switches view/faculty
  activeView?: string; // 'faculty_admin' | 'professor' | 'student'
  facultyId?: string; // Currently selected faculty UUID
  iat?: number;
  exp?: number;
}

// Custom extractor that checks both header and query parameter
function extractJwtFromHeaderOrQuery(req: Request): string | null {
  // First try Authorization header
  const headerToken = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
  if (headerToken) {
    return headerToken;
  }
  // Fall back to query parameter (for PDF streaming)
  const queryToken = req.query?.['token'];
  if (typeof queryToken === 'string') {
    return queryToken;
  }
  return null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const jwtConfig = configService.get<JwtConfig>('jwt');
    if (!jwtConfig) {
      throw new Error('JWT configuration not found');
    }

    super({
      jwtFromRequest: extractJwtFromHeaderOrQuery,
      ignoreExpiration: false,
      secretOrKey: jwtConfig.accessSecret,
    });
  }

  async validate(payload: JwtPayload): Promise<JwtPayload> {
    const user = await this.prisma.user.findFirst({
      where: { id: payload.sub, isActive: true, deletedAt: null },
      select: { id: true, email: true, isSuperAdmin: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found or inactive');
    }

    const result: JwtPayload = {
      sub: user.id,
      email: user.email,
      isSuperAdmin: user.isSuperAdmin,
    };
    // Preserve context from token (only if set)
    if (payload.activeView) {
      result.activeView = payload.activeView;
    }
    if (payload.facultyId) {
      result.facultyId = payload.facultyId;
    }
    return result;
  }
}
