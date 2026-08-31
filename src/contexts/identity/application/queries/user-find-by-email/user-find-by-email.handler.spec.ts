import { UserFindByEmailQuery } from '@contexts/identity/application/queries/user-find-by-email/user-find-by-email.query';
import { IUserReadRepository } from '@contexts/identity/domain/repositories/read/user-read.repository';
import { UserViewModel } from '@contexts/identity/domain/view-models/user.view-model';

import { UserFindByEmailQueryHandler } from './user-find-by-email.handler';

describe('UserFindByEmailQueryHandler', () => {
  let handler: UserFindByEmailQueryHandler;
  let userReadRepository: jest.Mocked<IUserReadRepository>;

  beforeEach(() => {
    userReadRepository = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      findByCriteria: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };
    handler = new UserFindByEmailQueryHandler(userReadRepository);
  });

  it('should return the view model when a user matches', async () => {
    const viewModel = new UserViewModel({
      id: '550e8400-e29b-41d4-a716-446655440000',
      externalId: 'kc-sub-1',
      email: 'user@example.com',
      displayName: 'User',
      platformAdmin: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    userReadRepository.findByEmail.mockResolvedValue(viewModel);

    const result = await handler.execute(
      new UserFindByEmailQuery({ email: 'user@example.com' }),
    );

    expect(result).toBe(viewModel);
    expect(userReadRepository.findByEmail).toHaveBeenCalledWith(
      'user@example.com',
    );
  });

  it('should return null when no user matches', async () => {
    userReadRepository.findByEmail.mockResolvedValue(null);

    const result = await handler.execute(
      new UserFindByEmailQuery({ email: 'missing@example.com' }),
    );

    expect(result).toBeNull();
  });
});
