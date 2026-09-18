import { RefreshSessionCommand } from '@contexts/auth/application/commands/refresh-session/refresh-session.command';
import {
  ITenantMembershipLookupPort,
  TENANT_MEMBERSHIP_LOOKUP_PORT,
} from '@contexts/auth/application/ports/tenant-membership-lookup.port';
import {
  IUserLookupPort,
  USER_LOOKUP_PORT,
} from '@contexts/auth/application/ports/user-lookup.port';
import { ILoginSessionResult } from '@contexts/auth/application/commands/login-session-result.interface';
import { GenerateRefreshTokenService } from '@contexts/auth/application/services/write/generate-refresh-token/generate-refresh-token.service';
import { HashRefreshTokenService } from '@contexts/auth/application/services/write/hash-refresh-token/hash-refresh-token.service';
import { TokenSignService } from '@contexts/auth/application/services/write/token-sign/token-sign.service';
import { SessionBuilder } from '@contexts/auth/domain/builders/session.builder';
import { InvalidRefreshTokenException } from '@contexts/auth/domain/exceptions/invalid-refresh-token.exception';
import { RefreshTokenReuseDetectedException } from '@contexts/auth/domain/exceptions/refresh-token-reuse-detected.exception';
import { IRotateResult } from '@contexts/auth/domain/interfaces/rotate-result.interface';
import {
  ISessionWriteRepository,
  SESSION_WRITE_REPOSITORY,
} from '@contexts/auth/domain/repositories/write/session-write.repository';
import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ConfigService } from '@nestjs/config';
import { UuidValueObject } from '@sisques-labs/nestjs-kit';

@CommandHandler(RefreshSessionCommand)
export class RefreshSessionCommandHandler implements ICommandHandler<RefreshSessionCommand> {
  private readonly logger = new Logger(RefreshSessionCommandHandler.name);

  constructor(
    @Inject(SESSION_WRITE_REPOSITORY)
    private readonly sessionWriteRepository: ISessionWriteRepository,
    @Inject(USER_LOOKUP_PORT)
    private readonly userLookupPort: IUserLookupPort,
    @Inject(TENANT_MEMBERSHIP_LOOKUP_PORT)
    private readonly tenantMembershipLookupPort: ITenantMembershipLookupPort,
    private readonly tokenSignService: TokenSignService,
    private readonly generateRefreshTokenService: GenerateRefreshTokenService,
    private readonly hashRefreshTokenService: HashRefreshTokenService,
    private readonly configService: ConfigService,
    private readonly sessionBuilder: SessionBuilder,
  ) {}

  async execute(command: RefreshSessionCommand): Promise<ILoginSessionResult> {
    const presentedHash = await this.hashRefreshTokenService.execute(
      command.refreshToken.value,
    );

    const rawRefreshToken = await this.generateRefreshTokenService.execute();
    const refreshTokenHash =
      await this.hashRefreshTokenService.execute(rawRefreshToken);
    const refreshTokenTtlDays = this.configService.get<number>(
      'auth.refreshTokenTtlDays',
      30,
    );
    const expiresAt = new Date(
      Date.now() + refreshTokenTtlDays * 24 * 60 * 60 * 1000,
    );

    const rotateResult: IRotateResult | null =
      await this.sessionWriteRepository.rotate(
        presentedHash,
        async (current) => {
          // Reuse: the presented token was already consumed by a prior
          // rotation. No grace window — reject outright and invalidate the
          // whole chain (see `auth-session-rotation/spec.md`).
          if (current.isRevoked()) {
            current.markReuseDetected();
            await this.sessionWriteRepository.revokeAllByUserId(
              current.userId.value,
            );
            throw new RefreshTokenReuseDetectedException();
          }

          if (current.isExpired()) {
            throw new InvalidRefreshTokenException();
          }

          const now = new Date();
          const created = this.sessionBuilder
            .withId(UuidValueObject.generate().value)
            .withUserId(current.userId.value)
            .withRefreshTokenHash(refreshTokenHash)
            .withExpiresAt(expiresAt)
            .withRevokedAt(null)
            .withReplacedBySessionId(null)
            .withCreatedAt(now)
            .withUpdatedAt(now)
            .build();

          current.revoke(created.id);

          return { revoked: current, created };
        },
      );

    if (!rotateResult) throw new InvalidRefreshTokenException();

    // Refresh only has the session's userId, not an email — this is why
    // `IUserLookupPort.findById` exists.
    const user = await this.userLookupPort.findById(
      rotateResult.created.userId.value,
    );
    if (!user) throw new InvalidRefreshTokenException();

    const tenants =
      await this.tenantMembershipLookupPort.findMembershipsByUserId(
        user.userId,
      );

    const accessToken = await this.tokenSignService.execute({
      sub: user.userId,
      email: user.email,
      platformAdmin: user.platformAdmin,
      tenants,
    });

    this.logger.log(`Session refreshed for user: ${user.userId}`);

    return { accessToken, refreshToken: rawRefreshToken };
  }
}
