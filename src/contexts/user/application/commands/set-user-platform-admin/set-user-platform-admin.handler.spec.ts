import { SetUserPlatformAdminCommand } from '@contexts/user/application/commands/set-user-platform-admin/set-user-platform-admin.command';
import { AssertUserExistsService } from '@contexts/user/application/services/write/assert-user-exists/assert-user-exists.service';
import { UserBuilder } from '@contexts/user/domain/builders/user.builder';
import { IUserWriteRepository } from '@contexts/user/domain/repositories/write/user-write.repository';
import { EventBus } from '@nestjs/cqrs';

import { SetUserPlatformAdminCommandHandler } from './set-user-platform-admin.handler';

describe('SetUserPlatformAdminCommandHandler', () => {
  let handler: SetUserPlatformAdminCommandHandler;
  let assertUserExistsService: jest.Mocked<AssertUserExistsService>;
  let userWriteRepository: jest.Mocked<IUserWriteRepository>;
  let eventBus: jest.Mocked<EventBus>;

  const USER_ID = '550e8400-e29b-41d4-a716-446655440000';

  function buildUser(platformAdmin: boolean) {
    return new UserBuilder()
      .withId(USER_ID)
      .withExternalId('kc-sub-1')
      .withEmail('user@example.com')
      .withPlatformAdmin(platformAdmin)
      .withCreatedAt(new Date('2024-01-01'))
      .withUpdatedAt(new Date('2024-01-01'))
      .build();
  }

  beforeEach(() => {
    assertUserExistsService = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<AssertUserExistsService>;
    userWriteRepository = {
      findByEmail: jest.fn(),
      findByExternalId: jest.fn(),
      findById: jest.fn(),
      findByCriteria: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };
    eventBus = {
      publish: jest.fn(),
      publishAll: jest.fn(),
    } as unknown as jest.Mocked<EventBus>;

    handler = new SetUserPlatformAdminCommandHandler(
      assertUserExistsService,
      userWriteRepository,
      eventBus,
    );
  });

  it('should grant platformAdmin and save when the flag actually changes', async () => {
    const user = buildUser(false);
    assertUserExistsService.execute.mockResolvedValue(user);
    userWriteRepository.save.mockResolvedValue(undefined as never);

    await handler.execute(
      new SetUserPlatformAdminCommand({
        userId: USER_ID,
        platformAdmin: true,
      }),
    );

    expect(user.platformAdmin.value).toBe(true);
    expect(userWriteRepository.save).toHaveBeenCalledWith(user);
    expect(eventBus.publishAll).toHaveBeenCalledTimes(1);
  });

  it('should short-circuit without saving when the flag is already the target value', async () => {
    const user = buildUser(true);
    assertUserExistsService.execute.mockResolvedValue(user);

    await handler.execute(
      new SetUserPlatformAdminCommand({
        userId: USER_ID,
        platformAdmin: true,
      }),
    );

    expect(userWriteRepository.save).not.toHaveBeenCalled();
    expect(eventBus.publishAll).not.toHaveBeenCalled();
  });
});
