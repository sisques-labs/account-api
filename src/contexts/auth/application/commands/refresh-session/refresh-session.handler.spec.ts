import { RefreshSessionCommand } from '@contexts/auth/application/commands/refresh-session/refresh-session.command';
import { ITenantMembershipLookupPort } from '@contexts/auth/application/ports/tenant-membership-lookup.port';
import { IUserLookupPort } from '@contexts/auth/application/ports/user-lookup.port';
import { GenerateRefreshTokenService } from '@contexts/auth/application/services/write/generate-refresh-token/generate-refresh-token.service';
import { HashRefreshTokenService } from '@contexts/auth/application/services/write/hash-refresh-token/hash-refresh-token.service';
import { TokenSignService } from '@contexts/auth/application/services/write/token-sign/token-sign.service';
import { SessionBuilder } from '@contexts/auth/domain/builders/session.builder';
import { InvalidRefreshTokenException } from '@contexts/auth/domain/exceptions/invalid-refresh-token.exception';
import { RefreshTokenReuseDetectedException } from '@contexts/auth/domain/exceptions/refresh-token-reuse-detected.exception';
import { IRotateResult } from '@contexts/auth/domain/interfaces/rotate-result.interface';
import { RotateSessionCallback } from '@contexts/auth/domain/interfaces/rotate-session-callback.interface';
import { ISessionWriteRepository } from '@contexts/auth/domain/repositories/write/session-write.repository';
import { ConfigService } from '@nestjs/config';

import { RefreshSessionCommandHandler } from './refresh-session.handler';

describe('RefreshSessionCommandHandler', () => {
  let handler: RefreshSessionCommandHandler;
  let sessionWriteRepository: jest.Mocked<ISessionWriteRepository>;
  let userLookupPort: jest.Mocked<IUserLookupPort>;
  let tenantMembershipLookupPort: jest.Mocked<ITenantMembershipLookupPort>;
  let tokenSignService: jest.Mocked<TokenSignService>;
  let generateRefreshTokenService: jest.Mocked<GenerateRefreshTokenService>;
  let hashRefreshTokenService: jest.Mocked<HashRefreshTokenService>;
  let configService: jest.Mocked<ConfigService>;
  let sessionBuilder: SessionBuilder;

  const command = new RefreshSessionCommand({
    refreshToken: 'raw-refresh-token',
  });

  const USER_LOOKUP_RESULT = {
    userId: '550e8400-e29b-41d4-a716-446655440000',
    email: 'user@example.com',
    platformAdmin: false,
  };

  const buildSession = (
    overrides: Partial<{
      expiresAt: Date;
      revokedAt: Date | null;
      replacedBySessionId: string | null;
    }> = {},
  ) =>
    new SessionBuilder()
      .withId('a1a1a1a1-e29b-41d4-a716-446655440000')
      .withUserId(USER_LOOKUP_RESULT.userId)
      .withRefreshTokenHash('a'.repeat(64))
      .withExpiresAt(overrides.expiresAt ?? new Date(Date.now() + 1_000_000))
      .withRevokedAt(overrides.revokedAt ?? null)
      .withReplacedBySessionId(overrides.replacedBySessionId ?? null)
      .withCreatedAt(new Date('2024-01-01'))
      .withUpdatedAt(new Date('2024-01-01'))
      .build();

  /**
   * Drives the same locked-transaction contract `SessionTypeOrmWriteRepository.rotate()`
   * provides in production: runs the handler-supplied callback against `current`
   * and lets it throw/return like the real repository would.
   */
  const runRotate = async (
    current: ReturnType<typeof buildSession> | null,
    callback: RotateSessionCallback,
  ): Promise<IRotateResult | null> => {
    if (!current) return null;
    const findLockedById = async () => null;
    return callback(current, findLockedById);
  };

  beforeEach(() => {
    sessionBuilder = new SessionBuilder();
    sessionWriteRepository = {
      findByUserId: jest.fn(),
      findByRefreshTokenHash: jest.fn(),
      findById: jest.fn(),
      findByCriteria: jest.fn(),
      rotate: jest.fn(),
      revokeAllByUserId: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };
    userLookupPort = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
    };
    tenantMembershipLookupPort = { findMembershipsByUserId: jest.fn() };
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

    handler = new RefreshSessionCommandHandler(
      sessionWriteRepository,
      userLookupPort,
      tenantMembershipLookupPort,
      tokenSignService,
      generateRefreshTokenService,
      hashRefreshTokenService,
      configService,
      sessionBuilder,
    );
  });

  it('should throw InvalidRefreshTokenException when no session matches the presented hash', async () => {
    hashRefreshTokenService.execute.mockResolvedValue('a'.repeat(64));
    sessionWriteRepository.rotate.mockImplementation((_hash, callback) =>
      runRotate(null, callback),
    );

    await expect(handler.execute(command)).rejects.toThrow(
      InvalidRefreshTokenException,
    );
  });

  it('should throw InvalidRefreshTokenException when the presented session is expired', async () => {
    hashRefreshTokenService.execute.mockResolvedValue('a'.repeat(64));
    const session = buildSession({ expiresAt: new Date(Date.now() - 1000) });
    sessionWriteRepository.rotate.mockImplementation((_hash, callback) =>
      runRotate(session, callback),
    );

    await expect(handler.execute(command)).rejects.toThrow(
      InvalidRefreshTokenException,
    );
  });

  it('should rotate the session and return a new access token', async () => {
    hashRefreshTokenService.execute
      .mockResolvedValueOnce('a'.repeat(64)) // presented token hash
      .mockResolvedValueOnce('c'.repeat(64)); // new token hash
    const session = buildSession();
    sessionWriteRepository.rotate.mockImplementation((_hash, callback) =>
      runRotate(session, callback),
    );
    userLookupPort.findById.mockResolvedValue(USER_LOOKUP_RESULT);
    tenantMembershipLookupPort.findMembershipsByUserId.mockResolvedValue([]);
    tokenSignService.execute.mockResolvedValue('new-access-token');
    generateRefreshTokenService.execute.mockResolvedValue('new-raw-token');

    const result = await handler.execute(command);

    expect(result.accessToken).toBe('new-access-token');
    expect(result.refreshToken).toBe('new-raw-token');
    expect(session.isRevoked()).toBe(true);
    expect(userLookupPort.findById).toHaveBeenCalledWith(
      USER_LOOKUP_RESULT.userId,
    );
  });

  describe('reuse detection', () => {
    it('should throw RefreshTokenReuseDetectedException and revoke the whole chain when the presented token is already consumed', async () => {
      hashRefreshTokenService.execute.mockResolvedValue('a'.repeat(64));
      const alreadyConsumed = buildSession({
        revokedAt: new Date('2024-06-01'),
        replacedBySessionId: 'b1b1b1b1-e29b-41d4-a716-446655440000',
      });
      sessionWriteRepository.rotate.mockImplementation((_hash, callback) =>
        runRotate(alreadyConsumed, callback),
      );

      await expect(handler.execute(command)).rejects.toThrow(
        RefreshTokenReuseDetectedException,
      );
      expect(sessionWriteRepository.revokeAllByUserId).toHaveBeenCalledWith(
        USER_LOOKUP_RESULT.userId,
      );
    });

    it('should never sign a new access token when reuse is detected', async () => {
      hashRefreshTokenService.execute.mockResolvedValue('a'.repeat(64));
      const alreadyConsumed = buildSession({
        revokedAt: new Date('2024-06-01'),
        replacedBySessionId: 'b1b1b1b1-e29b-41d4-a716-446655440000',
      });
      sessionWriteRepository.rotate.mockImplementation((_hash, callback) =>
        runRotate(alreadyConsumed, callback),
      );

      await expect(handler.execute(command)).rejects.toThrow(
        RefreshTokenReuseDetectedException,
      );
      expect(tokenSignService.execute).not.toHaveBeenCalled();
    });
  });
});
