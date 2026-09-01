import { IAccessTokenClaims } from '@core/security/access-token-claims.interface';
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { Request } from 'express';

/**
 * Requires the caller's access token to carry `platformAdmin: true`. Must
 * run after `JwtAuthGuard` (which populates `request.user`) — cross-cutting,
 * so it lives in `src/core/` alongside `JwtAuthGuard` rather than in any one
 * bounded context. Handles both REST and GraphQL execution contexts, same as
 * `JwtAuthGuard`.
 */
@Injectable()
export class PlatformAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = this.getRequest(context);

    if (!request.user?.platformAdmin) {
      throw new ForbiddenException('Platform admin access required');
    }

    return true;
  }

  private getRequest(
    context: ExecutionContext,
  ): Request & { user: IAccessTokenClaims } {
    if (context.getType<string>() === 'graphql') {
      return GqlExecutionContext.create(context).getContext<{
        req: Request & { user: IAccessTokenClaims };
      }>().req;
    }
    return context
      .switchToHttp()
      .getRequest<Request & { user: IAccessTokenClaims }>();
  }
}
