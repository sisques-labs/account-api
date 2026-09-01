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
});
