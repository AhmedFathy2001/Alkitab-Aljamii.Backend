import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

// Re-export JwtPayload from jwt.strategy for backwards compatibility
export type { JwtPayload } from '../../auth/strategies/jwt.strategy.js';
import type { JwtPayload } from '../../auth/strategies/jwt.strategy.js';

export interface UserContext {
  activeView?: string;
  facultyId?: string;
}

export const CurrentUser = createParamDecorator(
  (data: keyof JwtPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const user = request.user as JwtPayload | undefined;

    if (!user) {
      return undefined;
    }

    return data ? user[data] : user;
  },
);

/**
 * Extract the current context (activeView, facultyId) from the JWT token.
 * Use this in endpoints that need to filter by the user's current context.
 */
export const CurrentContext = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): UserContext => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const user = request.user as JwtPayload | undefined;

    const context: UserContext = {};
    if (user?.activeView) {
      context.activeView = user.activeView;
    }
    if (user?.facultyId) {
      context.facultyId = user.facultyId;
    }
    return context;
  },
);
