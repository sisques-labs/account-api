import { IAccessTokenClaims } from '@core/security/access-token-claims.interface';
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

/**
 * Requires a valid Sisques Account access token (`Authorization: Bearer`).
 * Cross-cutting — lives in `src/core/` (not owned by any bounded context)
 * because every context's transport layer needs it. Verifies with the same
 * `JwtService` (secret from `auth.jwtSecret`) that `auth`'s `TokenService`
 * uses to sign.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(request);
    if (!token) {
      throw new UnauthorizedException('Missing bearer token');
    }

    try {
      const claims = this.jwtService.verify<IAccessTokenClaims>(token);
      (request as Request & { user: IAccessTokenClaims }).user = claims;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }
  }

  private extractToken(request: Request): string | undefined {
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) return undefined;
    return header.slice('Bearer '.length);
  }
}
