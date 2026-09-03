import { IAccessTokenClaims } from '@core/security/access-token-claims.interface';
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { Request } from 'express';

export interface CurrentUserPayload {
  userId: string;
  email: string;
  platformAdmin: boolean;
  tenants: Array<{ tenantId: string; role: string }>;
}

/**
 * Extracted from the `@CurrentUser()` factory so it can be unit tested
 * directly — `createParamDecorator` factories aren't callable as plain
 * functions. Handles both REST and GraphQL execution contexts, same as
 * `JwtAuthGuard`.
 */
export function extractCurrentUser(
  _data: unknown,
  context: ExecutionContext,
): CurrentUserPayload {
  const request =
    context.getType<string>() === 'graphql'
      ? GqlExecutionContext.create(context).getContext<{
          req: Request & { user: IAccessTokenClaims };
        }>().req
      : context
          .switchToHttp()
          .getRequest<Request & { user: IAccessTokenClaims }>();
  const claims = request.user;

  return {
    userId: claims.sub,
    email: claims.email,
    platformAdmin: claims.platformAdmin,
    tenants: claims.tenants,
  };
}

/** Requires `JwtAuthGuard` to have run first (populates `request.user`). */
export const CurrentUser = createParamDecorator(extractCurrentUser);
