import { LoginUserCommand } from '@contexts/identity/application/commands/login-user/login-user.command';
import { IIdentityProviderPort } from '@contexts/identity/application/ports/identity-provider.port';
import { ITenantMembershipLookupPort } from '@contexts/identity/application/ports/tenant-membership-lookup.port';
import { TokenService } from '@contexts/identity/application/services/token.service';
import { GenerateRefreshTokenService } from '@contexts/identity/application/services/write/generate-refresh-token/generate-refresh-token.service';
import { HashRefreshTokenService } from '@contexts/identity/application/services/write/hash-refresh-token/hash-refresh-token.service';
import { UserBuilder } from '@contexts/identity/domain/builders/user.builder';
import { InvalidCredentialsException } from '@contexts/identity/domain/exceptions/invalid-credentials.exception';
import { IUserWriteRepository } from '@contexts/identity/domain/repositories/write/user-write.repository';
import { ConfigService } from '@nestjs/config';

import { LoginUserCommandHandler } from './login-user.handler';

describe('LoginUserCommandHandler', () => {
  let handler: LoginUserCommandHandler;
  let userWriteRepository: jest.Mocked<IUserWriteRepository>;
  let identityProviderPort: jest.Mocked<IIdentityProviderPort>;
  let tenantMembershipLookupPort: jest.Mocked<ITenantMembershipLookupPort>;
  let tokenService: jest.Mocked<TokenService>;
  let generateRefreshTokenService: jest.Mocked<GenerateRefreshTokenService>;
  let hashRefreshTokenService: jest.Mocked<HashRefreshTokenService>;
  let configService: jest.Mocked<ConfigService>;

  const command = new LoginUserCommand({
    email: 'user@example.com',
    password: 'whatever-it-was',
  });

  const buildUser = () =>
    new UserBuilder()
      .withId('550e8400-e29b-41d4-a716-446655440000')
      .withExternalId('kc-sub-1')
      .withEmail('user@example.com')
      .withDisplayName('User')
      .withCreatedAt(new Date('2024-01-01'))
      .withUpdatedAt(new Date('2024-01-01'))
      .build();

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
    tenantMembershipLookupPort = { findMembershipsByUserId: jest.fn() };
    tokenService = {
      sign: jest.fn(),
      verify: jest.fn(),
    } as unknown as jest.Mocked<TokenService>;
    generateRefreshTokenService = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GenerateRefreshTokenService>;
    hashRefreshTokenService = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<HashRefreshTokenService>;
    configService = {
      get: jest.fn().mockReturnValue(30),
    } as unknown as jest.Mocked<ConfigService>;

    handler = new LoginUserCommandHandler(
      userWriteRepository,
      identityProviderPort,
      tenantMembershipLookupPort,
      tokenService,
      generateRefreshTokenService,
      hashRefreshTokenService,
      configService,
    );
  });

  it('should throw InvalidCredentialsException when the identity provider rejects the credentials', async () => {
    identityProviderPort.verifyCredentials.mockRejectedValue(new Error('nope'));

    await expect(handler.execute(command)).rejects.toThrow(
      InvalidCredentialsException,
    );
    expect(userWriteRepository.findByEmail).not.toHaveBeenCalled();
  });

  it('should throw InvalidCredentialsException when no local user matches the email', async () => {
    identityProviderPort.verifyCredentials.mockResolvedValue({
      externalId: 'kc-sub-1',
    });
    userWriteRepository.findByEmail.mockResolvedValue(null);

    await expect(handler.execute(command)).rejects.toThrow(
      InvalidCredentialsException,
    );
  });

  it('should sign an access token embedding tenant memberships', async () => {
    identityProviderPort.verifyCredentials.mockResolvedValue({
      externalId: 'kc-sub-1',
    });
    const user = buildUser();
    userWriteRepository.findByEmail.mockResolvedValue(user);
    userWriteRepository.save.mockResolvedValue(user);
    tenantMembershipLookupPort.findMembershipsByUserId.mockResolvedValue([
      { tenantId: 'tenant-1', role: 'owner' },
    ]);
    tokenService.sign.mockReturnValue('signed-access-token');
    generateRefreshTokenService.execute.mockReturnValue('raw-refresh-token');
    hashRefreshTokenService.execute.mockReturnValue('a'.repeat(64));

    const result = await handler.execute(command);

    expect(tokenService.sign).toHaveBeenCalledWith({
      sub: user.id.value,
      email: user.email.value,
      platformAdmin: false,
      tenants: [{ tenantId: 'tenant-1', role: 'owner' }],
    });
    expect(result.accessToken).toBe('signed-access-token');
    expect(result.refreshToken).toBe('raw-refresh-token');
  });

  it('should persist the hashed rotated refresh token on the user', async () => {
    identityProviderPort.verifyCredentials.mockResolvedValue({
      externalId: 'kc-sub-1',
    });
    const user = buildUser();
    userWriteRepository.findByEmail.mockResolvedValue(user);
    userWriteRepository.save.mockResolvedValue(user);
    tenantMembershipLookupPort.findMembershipsByUserId.mockResolvedValue([]);
    tokenService.sign.mockReturnValue('signed-access-token');
    generateRefreshTokenService.execute.mockReturnValue('raw-refresh-token');
    hashRefreshTokenService.execute.mockReturnValue('b'.repeat(64));

    await handler.execute(command);

    expect(userWriteRepository.save).toHaveBeenCalledWith(user);
    expect(user.refreshTokenHash?.value).toBe('b'.repeat(64));
  });
});
