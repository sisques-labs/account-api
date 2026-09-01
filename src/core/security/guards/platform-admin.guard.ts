import { IAccessTokenClaims } from '@core/security/access-token-claims.interface';
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';

/**
 * Requires the caller's access token to carry `platformAdmin: true`. Must
 * run after `JwtAuthGuard` (which populates `request.user`) — cross-cutting,
 * so it lives in `src/core/` alongside `JwtAuthGuard` rather than in any one
 * bounded context.
 */
@Injectable()
export class PlatformAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user: IAccessTokenClaims }>();

    if (!request.user?.platformAdmin) {
      throw new ForbiddenException('Platform admin access required');
    }

    return true;
  }
}
