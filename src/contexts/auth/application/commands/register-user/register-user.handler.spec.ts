import { RegisterUserCommand } from '@contexts/auth/application/commands/register-user/register-user.command';
import { IIdentityProviderPort } from '@contexts/auth/application/ports/identity-provider.port';
import { IUserLookupPort } from '@contexts/auth/application/ports/user-lookup.port';
import { IUserProvisioningPort } from '@contexts/auth/application/ports/user-provisioning.port';
import { EmailAlreadyRegisteredException } from '@contexts/auth/domain/exceptions/email-already-registered.exception';

import { RegisterUserCommandHandler } from './register-user.handler';

describe('RegisterUserCommandHandler', () => {
  let handler: RegisterUserCommandHandler;
  let userLookupPort: jest.Mocked<IUserLookupPort>;
  let identityProviderPort: jest.Mocked<IIdentityProviderPort>;
  let userProvisioningPort: jest.Mocked<IUserProvisioningPort>;

  const command = new RegisterUserCommand({
    email: 'new@example.com',
    password: 'Sup3rStrongPassw0rd!',
    displayName: 'New User',
  });

  beforeEach(() => {
    userLookupPort = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
    };
    identityProviderPort = {
      registerIdentity: jest.fn(),
      verifyCredentials: jest.fn(),
    };
    userProvisioningPort = {
      createUser: jest.fn(),
    };

    handler = new RegisterUserCommandHandler(
      userLookupPort,
      identityProviderPort,
      userProvisioningPort,
    );
  });

  it('should check email availability before calling the identity provider', async () => {
    userLookupPort.findByEmail.mockResolvedValue(null);
    identityProviderPort.registerIdentity.mockResolvedValue({
      externalId: 'kc-sub-1',
    });
    userProvisioningPort.createUser.mockResolvedValue({
      userId: 'user-1',
    });

    await handler.execute(command);

    expect(userLookupPort.findByEmail).toHaveBeenCalledWith('new@example.com');
  });

  it('should not call the identity provider when the email is already taken', async () => {
    userLookupPort.findByEmail.mockResolvedValue({
      userId: 'user-1',
      email: 'new@example.com',
      platformAdmin: false,
    });

    await expect(handler.execute(command)).rejects.toThrow(
      EmailAlreadyRegisteredException,
    );
    expect(identityProviderPort.registerIdentity).not.toHaveBeenCalled();
    expect(userProvisioningPort.createUser).not.toHaveBeenCalled();
  });

  it('should register the identity with the provider using primitive values', async () => {
    userLookupPort.findByEmail.mockResolvedValue(null);
    identityProviderPort.registerIdentity.mockResolvedValue({
      externalId: 'kc-sub-1',
    });
    userProvisioningPort.createUser.mockResolvedValue({
      userId: 'user-1',
    });

    await handler.execute(command);

    expect(identityProviderPort.registerIdentity).toHaveBeenCalledWith({
      email: 'new@example.com',
      password: 'Sup3rStrongPassw0rd!',
      displayName: 'New User',
    });
  });

  it('should provision the local user with the external id returned by the provider', async () => {
    userLookupPort.findByEmail.mockResolvedValue(null);
    identityProviderPort.registerIdentity.mockResolvedValue({
      externalId: 'kc-sub-1',
    });
    userProvisioningPort.createUser.mockResolvedValue({
      userId: 'user-1',
    });

    await handler.execute(command);

    expect(userProvisioningPort.createUser).toHaveBeenCalledWith({
      externalId: 'kc-sub-1',
      email: 'new@example.com',
      displayName: 'New User',
    });
  });

  it('should return the provisioning result', async () => {
    userLookupPort.findByEmail.mockResolvedValue(null);
    identityProviderPort.registerIdentity.mockResolvedValue({
      externalId: 'kc-sub-1',
    });
    userProvisioningPort.createUser.mockResolvedValue({
      userId: 'user-1',
    });

    const result = await handler.execute(command);

    expect(result).toEqual({ userId: 'user-1' });
  });

  it('should pass displayName through as undefined when not provided', async () => {
    const commandWithoutDisplayName = new RegisterUserCommand({
      email: 'new@example.com',
      password: 'Sup3rStrongPassw0rd!',
    });
    userLookupPort.findByEmail.mockResolvedValue(null);
    identityProviderPort.registerIdentity.mockResolvedValue({
      externalId: 'kc-sub-1',
    });
    userProvisioningPort.createUser.mockResolvedValue({
      userId: 'user-1',
    });

    await handler.execute(commandWithoutDisplayName);

    expect(identityProviderPort.registerIdentity).toHaveBeenCalledWith({
      email: 'new@example.com',
      password: 'Sup3rStrongPassw0rd!',
      displayName: undefined,
    });
    expect(userProvisioningPort.createUser).toHaveBeenCalledWith({
      externalId: 'kc-sub-1',
      email: 'new@example.com',
      displayName: undefined,
    });
  });
});
