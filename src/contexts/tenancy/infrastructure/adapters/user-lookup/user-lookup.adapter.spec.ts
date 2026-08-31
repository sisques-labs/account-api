import { UserFindByEmailQuery } from '@contexts/user/application/queries/user-find-by-email/user-find-by-email.query';
import { UserViewModel } from '@contexts/user/domain/view-models/user.view-model';
import { QueryBus } from '@nestjs/cqrs';

import { UserLookupAdapter } from './user-lookup.adapter';

describe('UserLookupAdapter', () => {
  let adapter: UserLookupAdapter;
  let queryBus: jest.Mocked<QueryBus>;

  beforeEach(() => {
    queryBus = { execute: jest.fn() } as unknown as jest.Mocked<QueryBus>;
    adapter = new UserLookupAdapter(queryBus);
  });

  it('should dispatch UserFindByEmailQuery and return the userId', async () => {
    const user = new UserViewModel({
      id: '550e8400-e29b-41d4-a716-446655440000',
      externalId: 'kc-sub-1',
      email: 'user@example.com',
      displayName: 'User',
      platformAdmin: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    queryBus.execute.mockResolvedValue(user);

    const result = await adapter.findUserIdByEmail('user@example.com');

    expect(queryBus.execute).toHaveBeenCalledWith(
      expect.any(UserFindByEmailQuery),
    );
    expect(result).toEqual({ userId: user.id });
  });

  it('should return null when no user matches', async () => {
    queryBus.execute.mockResolvedValue(null);

    const result = await adapter.findUserIdByEmail('missing@example.com');

    expect(result).toBeNull();
  });
});
