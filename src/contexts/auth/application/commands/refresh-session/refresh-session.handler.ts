import { RefreshSessionCommand } from '@contexts/auth/application/commands/refresh-session/refresh-session.command';
import {
  ITenantMembershipLookupPort,
  TENANT_MEMBERSHIP_LOOKUP_PORT,
} from '@contexts/auth/application/ports/tenant-membership-lookup.port';
import {
  IUserLookupPort,
  USER_LOOKUP_PORT,
} from '@contexts/auth/application/ports/user-lookup.port';
import { ILoginSessionResult } from '@contexts/auth/application/commands/login-user/login-user.handler';
import { GenerateRefreshTokenService } from '@contexts/auth/application/services/write/generate-refresh-token/generate-refresh-token.service';
import { HashRefreshTokenService } from '@contexts/auth/application/services/write/hash-refresh-token/hash-refresh-token.service';
import { TokenSignService } from '@contexts/auth/application/services/write/token-sign/token-sign.service';
import { InvalidRefreshTokenException } from '@contexts/auth/domain/exceptions/invalid-refresh-token.exception';
import {
  ISessionWriteRepository,
  SESSION_WRITE_REPOSITORY,
} from '@contexts/auth/domain/repositories/write/session-write.repository';
import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ConfigService } from '@nestjs/config';

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
  ) {}

  async execute(command: RefreshSessionCommand): Promise<ILoginSessionResult> {
    const presentedHash = await this.hashRefreshTokenService.execute(
      command.refreshToken.value,
    );

    const session =
      await this.sessionWriteRepository.findByRefreshTokenHash(presentedHash);
    if (!session) throw new InvalidRefreshTokenException();

    if (session.isExpired()) {
      await this.sessionWriteRepository.delete(session.id.value);
      throw new InvalidRefreshTokenException();
    }

    // Refresh only has the session's userId, not an email — this is why
    // `IUserLookupPort.findById` exists.
    const user = await this.userLookupPort.findById(session.userId.value);
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

    const rawRefreshToken = this.generateRefreshTokenService.execute();
    const refreshTokenHash =
      await this.hashRefreshTokenService.execute(rawRefreshToken);
    const refreshTokenTtlDays = this.configService.get<number>(
      'auth.refreshTokenTtlDays',
      30,
    );
    const expiresAt = new Date(
      Date.now() + refreshTokenTtlDays * 24 * 60 * 60 * 1000,
    );

    session.rotate(refreshTokenHash, expiresAt);
    await this.sessionWriteRepository.save(session);

    this.logger.log(`Session refreshed for user: ${user.userId}`);

    return { accessToken, refreshToken: rawRefreshToken };
  }
}
