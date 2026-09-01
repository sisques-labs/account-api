import { UserAggregate } from '@contexts/user/domain/aggregates/user.aggregate';
import { UserEmailAlreadyRegisteredException } from '@contexts/user/domain/exceptions/user-email-already-registered.exception';
import { IUserWriteRepository } from '@contexts/user/domain/repositories/write/user-write.repository';
import { UserEmailValueObject } from '@contexts/user/domain/value-objects/user-email/user-email.vo';

import { AssertUserEmailAvailableService } from './assert-user-email-available.service';

describe('AssertUserEmailAvailableService', () => {
  let service: AssertUserEmailAvailableService;
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
    service = new AssertUserEmailAvailableService(userWriteRepository);
  });

  it('should resolve when no user exists with that email', async () => {
    userWriteRepository.findByEmail.mockResolvedValue(null);

    await expect(
      service.execute(new UserEmailValueObject('free@example.com')),
    ).resolves.toBeUndefined();
  });

  it('should throw UserEmailAlreadyRegisteredException when the email is taken', async () => {
    userWriteRepository.findByEmail.mockResolvedValue(
      {} as unknown as UserAggregate,
    );

    await expect(
      service.execute(new UserEmailValueObject('taken@example.com')),
    ).rejects.toThrow(UserEmailAlreadyRegisteredException);
  });
});
