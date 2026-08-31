import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let jwtService: jest.Mocked<JwtService>;

  const buildContext = (authorization?: string): ExecutionContext => {
    const request = { headers: { authorization } };
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    jwtService = {
      verify: jest.fn(),
    } as unknown as jest.Mocked<JwtService>;
    guard = new JwtAuthGuard(jwtService);
  });

  it('should throw UnauthorizedException when no Authorization header is present', () => {
    expect(() => guard.canActivate(buildContext())).toThrow(
      UnauthorizedException,
    );
  });

  it('should throw UnauthorizedException when the header is not a Bearer token', () => {
    expect(() => guard.canActivate(buildContext('Basic abc123'))).toThrow(
      UnauthorizedException,
    );
  });

  it('should throw UnauthorizedException when the token fails verification', () => {
    jwtService.verify.mockImplementation(() => {
      throw new Error('invalid');
    });

    expect(() => guard.canActivate(buildContext('Bearer bad-token'))).toThrow(
      UnauthorizedException,
    );
  });

  it('should attach the decoded claims to the request and allow access', () => {
    const claims = {
      sub: 'user-1',
      email: 'user@example.com',
      platformAdmin: false,
      tenants: [],
    };
    jwtService.verify.mockReturnValue(claims);
    const context = buildContext('Bearer good-token');

    expect(guard.canActivate(context)).toBe(true);
    const request = context.switchToHttp().getRequest() as {
      user: unknown;
    };
    expect(request.user).toEqual(claims);
  });
});
