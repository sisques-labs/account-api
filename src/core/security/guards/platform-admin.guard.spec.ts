import { ExecutionContext, ForbiddenException } from '@nestjs/common';

import { PlatformAdminGuard } from './platform-admin.guard';

describe('PlatformAdminGuard', () => {
  let guard: PlatformAdminGuard;

  const buildContext = (user?: {
    platformAdmin: boolean;
  }): ExecutionContext => {
    const request = { user };
    return {
      getType: () => 'http',
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;
  };

  const buildGraphQLContext = (user?: {
    platformAdmin: boolean;
  }): ExecutionContext => {
    const request = { user };
    return {
      getType: () => 'graphql',
      getArgs: () => [{}, {}, { req: request }, {}],
      getClass: () => PlatformAdminGuard,
      getHandler: () => (): void => undefined,
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    guard = new PlatformAdminGuard();
  });

  it('should throw ForbiddenException when there is no user on the request', () => {
    expect(() => guard.canActivate(buildContext())).toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException when the user is not a platform admin', () => {
    expect(() =>
      guard.canActivate(buildContext({ platformAdmin: false })),
    ).toThrow(ForbiddenException);
  });

  it('should allow access when the user is a platform admin', () => {
    expect(guard.canActivate(buildContext({ platformAdmin: true }))).toBe(true);
  });

  it('should read the request from the GraphQL context and allow access', () => {
    expect(
      guard.canActivate(buildGraphQLContext({ platformAdmin: true })),
    ).toBe(true);
  });

  it('should throw ForbiddenException in GraphQL context when the user is not a platform admin', () => {
    expect(() =>
      guard.canActivate(buildGraphQLContext({ platformAdmin: false })),
    ).toThrow(ForbiddenException);
  });
});
