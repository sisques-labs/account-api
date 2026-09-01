import { ExecutionContext } from '@nestjs/common';

import { extractCurrentUser } from './current-user.decorator';

describe('extractCurrentUser', () => {
  it('should map JWT claims to a CurrentUserPayload', () => {
    const claims = {
      sub: 'user-1',
      email: 'user@example.com',
      platformAdmin: true,
      tenants: [{ tenantId: 'tenant-1', role: 'owner' }],
    };
    const context = {
      getType: () => 'http',
      switchToHttp: () => ({
        getRequest: () => ({ user: claims }),
      }),
    } as unknown as ExecutionContext;

    const result = extractCurrentUser(undefined, context);

    expect(result).toEqual({
      userId: 'user-1',
      email: 'user@example.com',
      platformAdmin: true,
      tenants: [{ tenantId: 'tenant-1', role: 'owner' }],
    });
  });

  it('should map JWT claims to a CurrentUserPayload from the GraphQL context', () => {
    const claims = {
      sub: 'user-1',
      email: 'user@example.com',
      platformAdmin: true,
      tenants: [{ tenantId: 'tenant-1', role: 'owner' }],
    };
    const context = {
      getType: () => 'graphql',
      getArgs: () => [{}, {}, { req: { user: claims } }, {}],
      getClass: () => undefined,
      getHandler: () => (): void => undefined,
    } as unknown as ExecutionContext;

    const result = extractCurrentUser(undefined, context);

    expect(result).toEqual({
      userId: 'user-1',
      email: 'user@example.com',
      platformAdmin: true,
      tenants: [{ tenantId: 'tenant-1', role: 'owner' }],
    });
  });
});
