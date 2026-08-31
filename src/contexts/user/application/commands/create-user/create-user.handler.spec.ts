import { CreateUserCommand } from '@contexts/user/application/commands/create-user/create-user.command';
import { AssertUserEmailAvailableService } from '@contexts/user/application/services/write/assert-user-email-available/assert-user-email-available.service';
import { UserBuilder } from '@contexts/user/domain/builders/user.builder';
import { UserEmailAlreadyRegisteredException } from '@contexts/user/domain/exceptions/user-email-already-registered.exception';
import { IUserWriteRepository } from '@contexts/user/domain/repositories/write/user-write.repository';
import { EventBus } from '@nestjs/cqrs';

import { CreateUserCommandHandler } from './create-user.handler';

describe('CreateUserCommandHandler', () => {
  let handler: CreateUserCommandHandler;
  let userWriteRepository: jest.Mocked<IUserWriteRepository>;
  let assertUserEmailAvailableService: jest.Mocked<AssertUserEmailAvailableService>;
  let eventBus: jest.Mocked<EventBus>;

  const command = new CreateUserCommand({
    externalId: 'kc-sub-1',
    email: 'new@example.com',
    displayName: 'New User',
  });

  beforeEach(() => {
    userWriteRepository = {
      findByEmail: jest.fn(),
      findByExternalId: jest.fn(),
      findById: jest.fn(),
      findByCriteria: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };
    assertUserEmailAvailableService = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<AssertUserEmailAvailableService>;
    eventBus = {
      publish: jest.fn(),
      publishAll: jest.fn(),
    } as unknown as jest.Mocked<EventBus>;

    handler = new CreateUserCommandHandler(
      userWriteRepository,
      assertUserEmailAvailableService,
      new UserBuilder(),
      eventBus,
    );
  });

  it('should assert the email is available before saving', async () => {
    userWriteRepository.save.mockResolvedValue(undefined as never);

    await handler.execute(command);

    expect(assertUserEmailAvailableService.execute).toHaveBeenCalledWith(
      command.email,
    );
  });

  it('should not save when the email is already taken', async () => {
    assertUserEmailAvailableService.execute.mockRejectedValue(
      new UserEmailAlreadyRegisteredException('new@example.com'),
    );

    await expect(handler.execute(command)).rejects.toThrow(
      UserEmailAlreadyRegisteredException,
    );
    expect(userWriteRepository.save).not.toHaveBeenCalled();
  });

  it('should save a user built from the command', async () => {
    userWriteRepository.save.mockResolvedValue(undefined as never);

    await handler.execute(command);

    expect(userWriteRepository.save).toHaveBeenCalledTimes(1);
    const savedUser = userWriteRepository.save.mock.calls[0][0];
    expect(savedUser.externalId.value).toBe('kc-sub-1');
    expect(savedUser.email.value).toBe('new@example.com');
    expect(savedUser.platformAdmin.value).toBe(false);
  });

  it('should publish the UserRegisteredEvent', async () => {
    userWriteRepository.save.mockResolvedValue(undefined as never);

    await handler.execute(command);

    expect(eventBus.publishAll).toHaveBeenCalledTimes(1);
  });

  it('should return the new userId, email and displayName', async () => {
    userWriteRepository.save.mockResolvedValue(undefined as never);

    const result = await handler.execute(command);

    expect(result.email).toBe('new@example.com');
    expect(result.displayName).toBe('New User');
    expect(typeof result.userId).toBe('string');
  });
});
