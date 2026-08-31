import { RefreshSessionCommand } from '@contexts/identity/application/commands/refresh-session/refresh-session.command';
import { ITenantMembershipLookupPort } from '@contexts/identity/application/ports/tenant-membership-lookup.port';
import { TokenService } from '@contexts/identity/application/services/token.service';
import { GenerateRefreshTokenService } from '@contexts/identity/application/services/write/generate-refresh-token/generate-refresh-token.service';
import { HashRefreshTokenService } from '@contexts/identity/application/services/write/hash-refresh-token/hash-refresh-token.service';
import { UserBuilder } from '@contexts/identity/domain/builders/user.builder';
import { InvalidRefreshTokenException } from '@contexts/identity/domain/exceptions/invalid-refresh-token.exception';
import { IUserWriteRepository } from '@contexts/identity/domain/repositories/write/user-write.repository';
import { ConfigService } from '@nestjs/config';

import { RefreshSessionCommandHandler } from './refresh-session.handler';

describe('RefreshSessionCommandHandler', () => {
  let handler: RefreshSessionCommandHandler;
  let userWriteRepository: jest.Mocked<IUserWriteRepository>;
  let tenantMembershipLookupPort: jest.Mocked<ITenantMembershipLookupPort>;
  let tokenService: jest.Mocked<TokenService>;
  let generateRefreshTokenService: jest.Mocked<GenerateRefreshTokenService>;
  let hashRefreshTokenService: jest.Mocked<HashRefreshTokenService>;
  let configService: jest.Mocked<ConfigService>;

  const command = new RefreshSessionCommand({
    refreshToken: 'raw-refresh-token',
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

    handler = new RefreshSessionCommandHandler(
      userWriteRepository,
      tenantMembershipLookupPort,
      tokenService,
      generateRefreshTokenService,
      hashRefreshTokenService,
      configService,
    );
  });

  it('should throw InvalidRefreshTokenException when no user matches the hash', async () => {
    hashRefreshTokenService.execute.mockReturnValue('a'.repeat(64));
    userWriteRepository.findByRefreshTokenHash.mockResolvedValue(null);

    await expect(handler.execute(command)).rejects.toThrow(
      InvalidRefreshTokenException,
    );
  });

  it('should revoke and throw when the stored refresh token is expired', async () => {
    hashRefreshTokenService.execute.mockReturnValue('a'.repeat(64));
    const user = buildUser();
    user.issueRefreshToken('a'.repeat(64), new Date(Date.now() - 1000));
    userWriteRepository.findByRefreshTokenHash.mockResolvedValue(user);
    userWriteRepository.save.mockResolvedValue(user);

    await expect(handler.execute(command)).rejects.toThrow(
      InvalidRefreshTokenException,
    );
    expect(user.refreshTokenHash).toBeNull();
    expect(userWriteRepository.save).toHaveBeenCalledWith(user);
  });

  it('should rotate the refresh token and return a new access token', async () => {
    hashRefreshTokenService.execute
      .mockReturnValueOnce('a'.repeat(64)) // presented token hash
      .mockReturnValueOnce('c'.repeat(64)); // new token hash
    const user = buildUser();
    user.issueRefreshToken('a'.repeat(64), new Date(Date.now() + 1_000_000));
    userWriteRepository.findByRefreshTokenHash.mockResolvedValue(user);
    userWriteRepository.save.mockResolvedValue(user);
    tenantMembershipLookupPort.findMembershipsByUserId.mockResolvedValue([]);
    tokenService.sign.mockReturnValue('new-access-token');
    generateRefreshTokenService.execute.mockReturnValue('new-raw-token');

    const result = await handler.execute(command);

    expect(result.accessToken).toBe('new-access-token');
    expect(result.refreshToken).toBe('new-raw-token');
    expect(user.refreshTokenHash?.value).toBe('c'.repeat(64));
  });
});
