import { IAccessTokenClaims } from '@core/security/access-token-claims.interface';
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

/**
 * Requires a valid Sisques Account access token (`Authorization: Bearer`).
 * Cross-cutting — lives in `src/core/` (not owned by any bounded context)
 * because every context's transport layer needs it. Verifies with the same
 * `JwtService` (secret from `auth.jwtSecret`) that `auth`'s `TokenSignService`
 * uses to sign. Works for both REST controllers and GraphQL resolvers — a
 * GraphQL `ExecutionContext` has no HTTP request of its own, so the actual
 * `req` is pulled from the GraphQL context object instead (populated by
 * `GraphQLModule.forRoot`'s `context: ({ req, res }) => ({ req, res })`).
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = this.getRequest(context);
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

  private getRequest(context: ExecutionContext): Request {
    if (context.getType<string>() === 'graphql') {
      return GqlExecutionContext.create(context).getContext<{
        req: Request;
      }>().req;
    }
    return context.switchToHttp().getRequest<Request>();
  }
}
