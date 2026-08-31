import { RegisterUserCommand } from '@contexts/identity/application/commands/register-user/register-user.command';
import { IIdentityProviderPort } from '@contexts/identity/application/ports/identity-provider.port';
import { AssertUserEmailAvailableService } from '@contexts/identity/application/services/write/assert-user-email-available/assert-user-email-available.service';
import { UserBuilder } from '@contexts/identity/domain/builders/user.builder';
import { UserEmailAlreadyRegisteredException } from '@contexts/identity/domain/exceptions/user-email-already-registered.exception';
import { IUserWriteRepository } from '@contexts/identity/domain/repositories/write/user-write.repository';
import { EventBus } from '@nestjs/cqrs';

import { RegisterUserCommandHandler } from './register-user.handler';

describe('RegisterUserCommandHandler', () => {
  let handler: RegisterUserCommandHandler;
  let userWriteRepository: jest.Mocked<IUserWriteRepository>;
  let identityProviderPort: jest.Mocked<IIdentityProviderPort>;
  let assertUserEmailAvailableService: jest.Mocked<AssertUserEmailAvailableService>;
  let eventBus: jest.Mocked<EventBus>;

  const command = new RegisterUserCommand({
    email: 'new@example.com',
    password: 'Sup3rStrongPassw0rd!',
    displayName: 'New User',
  });

  beforeEach(() => {
    userWriteRepository = {
      findByEmail: jest.fn(),
      findByExternalId: jest.fn(),
      findByRefreshTokenHash: jest.fn(),
      findById: jest.fn(),
      findByCriteria: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };
    identityProviderPort = {
      registerIdentity: jest.fn(),
      verifyCredentials: jest.fn(),
    };
    assertUserEmailAvailableService = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<AssertUserEmailAvailableService>;
    eventBus = {
      publish: jest.fn(),
      publishAll: jest.fn(),
    } as unknown as jest.Mocked<EventBus>;

    handler = new RegisterUserCommandHandler(
      userWriteRepository,
      identityProviderPort,
      assertUserEmailAvailableService,
      new UserBuilder(),
      eventBus,
    );
  });

  it('should assert the email is available before calling the identity provider', async () => {
    identityProviderPort.registerIdentity.mockResolvedValue({
      externalId: 'kc-sub-1',
    });
    userWriteRepository.save.mockResolvedValue(undefined as never);

    await handler.execute(command);

    expect(assertUserEmailAvailableService.execute).toHaveBeenCalledWith(
      command.email,
    );
  });

  it('should not call the identity provider when the email is already taken', async () => {
    assertUserEmailAvailableService.execute.mockRejectedValue(
      new UserEmailAlreadyRegisteredException('new@example.com'),
    );

    await expect(handler.execute(command)).rejects.toThrow(
      UserEmailAlreadyRegisteredException,
    );
    expect(identityProviderPort.registerIdentity).not.toHaveBeenCalled();
  });

  it('should register the identity with the provider using primitive values', async () => {
    identityProviderPort.registerIdentity.mockResolvedValue({
      externalId: 'kc-sub-1',
    });
    userWriteRepository.save.mockResolvedValue(undefined as never);

    await handler.execute(command);

    expect(identityProviderPort.registerIdentity).toHaveBeenCalledWith({
      email: 'new@example.com',
      password: 'Sup3rStrongPassw0rd!',
      displayName: 'New User',
    });
  });

  it('should save a user built with the external id returned by the provider', async () => {
    identityProviderPort.registerIdentity.mockResolvedValue({
      externalId: 'kc-sub-1',
    });
    userWriteRepository.save.mockResolvedValue(undefined as never);

    await handler.execute(command);

    expect(userWriteRepository.save).toHaveBeenCalledTimes(1);
    const savedUser = userWriteRepository.save.mock.calls[0][0];
    expect(savedUser.externalId.value).toBe('kc-sub-1');
    expect(savedUser.email.value).toBe('new@example.com');
    expect(savedUser.platformAdmin.value).toBe(false);
  });

  it('should publish the UserRegisteredEvent', async () => {
    identityProviderPort.registerIdentity.mockResolvedValue({
      externalId: 'kc-sub-1',
    });
    userWriteRepository.save.mockResolvedValue(undefined as never);

    await handler.execute(command);

    expect(eventBus.publishAll).toHaveBeenCalledTimes(1);
  });

  it('should return the new userId, email and displayName', async () => {
    identityProviderPort.registerIdentity.mockResolvedValue({
      externalId: 'kc-sub-1',
    });
    userWriteRepository.save.mockResolvedValue(undefined as never);

    const result = await handler.execute(command);

    expect(result.email).toBe('new@example.com');
    expect(result.displayName).toBe('New User');
    expect(typeof result.userId).toBe('string');
  });
});
