import { IAccessTokenClaims } from '@core/security/access-token-claims.interface';
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
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
 * functions.
 */
export function extractCurrentUser(
  _data: unknown,
  context: ExecutionContext,
): CurrentUserPayload {
  const request = context
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
