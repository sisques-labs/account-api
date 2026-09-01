import { UserFindByIdQuery } from '@contexts/user/application/queries/user-find-by-id/user-find-by-id.query';
import { IUserReadRepository } from '@contexts/user/domain/repositories/read/user-read.repository';
import { UserViewModel } from '@contexts/user/domain/view-models/user.view-model';

import { UserFindByIdQueryHandler } from './user-find-by-id.handler';

describe('UserFindByIdQueryHandler', () => {
  let handler: UserFindByIdQueryHandler;
  let userReadRepository: jest.Mocked<IUserReadRepository>;

  const USER_ID = '550e8400-e29b-41d4-a716-446655440000';

  beforeEach(() => {
    userReadRepository = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      findByCriteria: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };
    handler = new UserFindByIdQueryHandler(userReadRepository);
  });

  it('should return the view model when a user matches', async () => {
    const viewModel = new UserViewModel({
      id: USER_ID,
      externalId: 'kc-sub-1',
      email: 'user@example.com',
      displayName: 'User',
      platformAdmin: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    userReadRepository.findById.mockResolvedValue(viewModel);

    const result = await handler.execute(
      new UserFindByIdQuery({ userId: USER_ID }),
    );

    expect(result).toBe(viewModel);
    expect(userReadRepository.findById).toHaveBeenCalledWith(USER_ID);
  });

  it('should return null when no user matches', async () => {
    userReadRepository.findById.mockResolvedValue(null);

    const result = await handler.execute(
      new UserFindByIdQuery({ userId: USER_ID }),
    );

    expect(result).toBeNull();
  });
});
