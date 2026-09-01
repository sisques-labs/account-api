import { LoginUserCommand } from '@contexts/auth/application/commands/login-user/login-user.command';
import { IIdentityProviderPort } from '@contexts/auth/application/ports/identity-provider.port';
import { ITenantMembershipLookupPort } from '@contexts/auth/application/ports/tenant-membership-lookup.port';
import { IUserLookupPort } from '@contexts/auth/application/ports/user-lookup.port';
import { GenerateRefreshTokenService } from '@contexts/auth/application/services/write/generate-refresh-token/generate-refresh-token.service';
import { HashRefreshTokenService } from '@contexts/auth/application/services/write/hash-refresh-token/hash-refresh-token.service';
import { TokenSignService } from '@contexts/auth/application/services/write/token-sign/token-sign.service';
import { SessionBuilder } from '@contexts/auth/domain/builders/session.builder';
import { InvalidCredentialsException } from '@contexts/auth/domain/exceptions/invalid-credentials.exception';
import { ISessionWriteRepository } from '@contexts/auth/domain/repositories/write/session-write.repository';
import { ConfigService } from '@nestjs/config';

import { LoginUserCommandHandler } from './login-user.handler';

describe('LoginUserCommandHandler', () => {
  let handler: LoginUserCommandHandler;
  let userLookupPort: jest.Mocked<IUserLookupPort>;
  let identityProviderPort: jest.Mocked<IIdentityProviderPort>;
  let tenantMembershipLookupPort: jest.Mocked<ITenantMembershipLookupPort>;
  let sessionWriteRepository: jest.Mocked<ISessionWriteRepository>;
  let tokenSignService: jest.Mocked<TokenSignService>;
  let generateRefreshTokenService: jest.Mocked<GenerateRefreshTokenService>;
  let hashRefreshTokenService: jest.Mocked<HashRefreshTokenService>;
  let configService: jest.Mocked<ConfigService>;

  const command = new LoginUserCommand({
    email: 'user@example.com',
    password: 'whatever-it-was',
  });

  const USER_LOOKUP_RESULT = {
    userId: '550e8400-e29b-41d4-a716-446655440000',
    email: 'user@example.com',
    platformAdmin: false,
  };

  beforeEach(() => {
    userLookupPort = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
    };
    identityProviderPort = {
      registerIdentity: jest.fn(),
      verifyCredentials: jest.fn(),
    };
    tenantMembershipLookupPort = { findMembershipsByUserId: jest.fn() };
    sessionWriteRepository = {
      findByUserId: jest.fn(),
      findByRefreshTokenHash: jest.fn(),
      findById: jest.fn(),
      findByCriteria: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };
    tokenSignService = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<TokenSignService>;
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
      userLookupPort,
      identityProviderPort,
      tenantMembershipLookupPort,
      sessionWriteRepository,
      tokenSignService,
      generateRefreshTokenService,
      hashRefreshTokenService,
      new SessionBuilder(),
      configService,
    );
  });

  it('should throw InvalidCredentialsException when the identity provider rejects the credentials', async () => {
    identityProviderPort.verifyCredentials.mockRejectedValue(new Error('nope'));

    await expect(handler.execute(command)).rejects.toThrow(
      InvalidCredentialsException,
    );
    expect(userLookupPort.findByEmail).not.toHaveBeenCalled();
  });

  it('should throw InvalidCredentialsException when no local user matches the email', async () => {
    identityProviderPort.verifyCredentials.mockResolvedValue({
      externalId: 'kc-sub-1',
    });
    userLookupPort.findByEmail.mockResolvedValue(null);

    await expect(handler.execute(command)).rejects.toThrow(
      InvalidCredentialsException,
    );
  });

  it('should sign an access token embedding tenant memberships', async () => {
    identityProviderPort.verifyCredentials.mockResolvedValue({
      externalId: 'kc-sub-1',
    });
    userLookupPort.findByEmail.mockResolvedValue(USER_LOOKUP_RESULT);
    sessionWriteRepository.findByUserId.mockResolvedValue(null);
    sessionWriteRepository.save.mockResolvedValue(undefined as never);
    tenantMembershipLookupPort.findMembershipsByUserId.mockResolvedValue([
      { tenantId: 'tenant-1', role: 'owner' },
    ]);
    tokenSignService.execute.mockResolvedValue('signed-access-token');
    generateRefreshTokenService.execute.mockResolvedValue('raw-refresh-token');
    hashRefreshTokenService.execute.mockResolvedValue('a'.repeat(64));

    const result = await handler.execute(command);

    expect(tokenSignService.execute).toHaveBeenCalledWith({
      sub: USER_LOOKUP_RESULT.userId,
      email: USER_LOOKUP_RESULT.email,
      platformAdmin: false,
      tenants: [{ tenantId: 'tenant-1', role: 'owner' }],
    });
    expect(result.accessToken).toBe('signed-access-token');
    expect(result.refreshToken).toBe('raw-refresh-token');
  });

  it('should create a new session when the user has none yet', async () => {
    identityProviderPort.verifyCredentials.mockResolvedValue({
      externalId: 'kc-sub-1',
    });
    userLookupPort.findByEmail.mockResolvedValue(USER_LOOKUP_RESULT);
    sessionWriteRepository.findByUserId.mockResolvedValue(null);
    sessionWriteRepository.save.mockResolvedValue(undefined as never);
    tenantMembershipLookupPort.findMembershipsByUserId.mockResolvedValue([]);
    tokenSignService.execute.mockResolvedValue('signed-access-token');
    generateRefreshTokenService.execute.mockResolvedValue('raw-refresh-token');
    hashRefreshTokenService.execute.mockResolvedValue('b'.repeat(64));

    await handler.execute(command);

    expect(sessionWriteRepository.save).toHaveBeenCalledTimes(1);
    const savedSession = sessionWriteRepository.save.mock.calls[0][0];
    expect(savedSession.userId.value).toBe(USER_LOOKUP_RESULT.userId);
    expect(savedSession.refreshTokenHash.value).toBe('b'.repeat(64));
  });

  it('should rotate the existing session when the user already has one', async () => {
    identityProviderPort.verifyCredentials.mockResolvedValue({
      externalId: 'kc-sub-1',
    });
    userLookupPort.findByEmail.mockResolvedValue(USER_LOOKUP_RESULT);
    const existingSession = new SessionBuilder()
      .withId('a1a1a1a1-e29b-41d4-a716-446655440000')
      .withUserId(USER_LOOKUP_RESULT.userId)
      .withRefreshTokenHash('a'.repeat(64))
      .withExpiresAt(new Date(Date.now() + 1_000_000))
      .withCreatedAt(new Date('2024-01-01'))
      .withUpdatedAt(new Date('2024-01-01'))
      .build();
    sessionWriteRepository.findByUserId.mockResolvedValue(existingSession);
    sessionWriteRepository.save.mockResolvedValue(existingSession);
    tenantMembershipLookupPort.findMembershipsByUserId.mockResolvedValue([]);
    tokenSignService.execute.mockResolvedValue('signed-access-token');
    generateRefreshTokenService.execute.mockResolvedValue('raw-refresh-token');
    hashRefreshTokenService.execute.mockResolvedValue('c'.repeat(64));

    await handler.execute(command);

    expect(sessionWriteRepository.save).toHaveBeenCalledWith(existingSession);
    expect(existingSession.refreshTokenHash.value).toBe('c'.repeat(64));
  });
});
