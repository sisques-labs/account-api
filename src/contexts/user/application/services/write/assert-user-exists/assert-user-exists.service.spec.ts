import { UserAggregate } from '@contexts/user/domain/aggregates/user.aggregate';
import { UserNotFoundException } from '@contexts/user/domain/exceptions/user-not-found.exception';
import { IUserWriteRepository } from '@contexts/user/domain/repositories/write/user-write.repository';
import { UuidValueObject } from '@sisques-labs/nestjs-kit';

import { AssertUserExistsService } from './assert-user-exists.service';

describe('AssertUserExistsService', () => {
  let service: AssertUserExistsService;
  let userWriteRepository: jest.Mocked<IUserWriteRepository>;

  beforeEach(() => {
    userWriteRepository = {
      findByEmail: jest.fn(),
      findByExternalId: jest.fn(),
      findById: jest.fn(),
      findByCriteria: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };
    service = new AssertUserExistsService(userWriteRepository);
  });

  it('should return the user when found', async () => {
    const user = {} as unknown as UserAggregate;
    userWriteRepository.findById.mockResolvedValue(user);

    await expect(service.execute(UuidValueObject.generate())).resolves.toBe(
      user,
    );
  });

  it('should throw UserNotFoundException when not found', async () => {
    userWriteRepository.findById.mockResolvedValue(null);

    await expect(service.execute(UuidValueObject.generate())).rejects.toThrow(
      UserNotFoundException,
    );
  });
});
