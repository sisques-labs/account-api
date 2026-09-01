import { ExecutionContext, ForbiddenException } from '@nestjs/common';

import { PlatformAdminGuard } from './platform-admin.guard';

describe('PlatformAdminGuard', () => {
  let guard: PlatformAdminGuard;

  const buildContext = (user?: {
    platformAdmin: boolean;
  }): ExecutionContext => {
    const request = { user };
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
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
});
