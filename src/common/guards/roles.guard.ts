import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { ROLES_KEY, type RoleValue } from '../decorators/roles.decorator.js';
import type { JwtPayload } from '../decorators/current-user.decorator.js';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<RoleValue[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as JwtPayload | undefined;

    if (!user) {
      throw new ForbiddenException('User not found in request');
    }

    // Super admin bypasses all role checks if super_admin is in required roles
    if (user.isSuperAdmin && requiredRoles.includes('super_admin')) {
      return true;
    }

    // For non-super-admins, use activeView as the effective role
    // activeView is set when user switches context to a faculty
    const effectiveRole = user.activeView as RoleValue | undefined;

    if (!effectiveRole) {
      // If super_admin is required and user is super admin, they pass
      // Otherwise, no active context means they can't access faculty-scoped routes
      if (user.isSuperAdmin) {
        throw new ForbiddenException(
          'Super admin cannot access faculty-scoped endpoints',
        );
      }
      throw new ForbiddenException('No active view context');
    }

    const hasRole = requiredRoles.some((role) => role === effectiveRole);

    if (!hasRole) {
      throw new ForbiddenException('Insufficient permissions for current view');
    }

    return true;
  }
}
