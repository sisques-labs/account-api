import { ILoginSessionResult } from '@contexts/identity/application/commands/login-user/login-session-result.interface';
import { RefreshSessionCommand } from '@contexts/identity/application/commands/refresh-session/refresh-session.command';
import {
  ITenantMembershipLookupPort,
  TENANT_MEMBERSHIP_LOOKUP_PORT,
} from '@contexts/identity/application/ports/tenant-membership-lookup.port';
import { GenerateRefreshTokenService } from '@contexts/identity/application/services/write/generate-refresh-token/generate-refresh-token.service';
import { HashRefreshTokenService } from '@contexts/identity/application/services/write/hash-refresh-token/hash-refresh-token.service';
import { TokenService } from '@contexts/identity/application/services/token.service';
import { InvalidRefreshTokenException } from '@contexts/identity/domain/exceptions/invalid-refresh-token.exception';
import {
  IUserWriteRepository,
  USER_WRITE_REPOSITORY,
} from '@contexts/identity/domain/repositories/write/user-write.repository';
import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ConfigService } from '@nestjs/config';

@CommandHandler(RefreshSessionCommand)
export class RefreshSessionCommandHandler implements ICommandHandler<RefreshSessionCommand> {
  private readonly logger = new Logger(RefreshSessionCommandHandler.name);

  constructor(
    @Inject(USER_WRITE_REPOSITORY)
    private readonly userWriteRepository: IUserWriteRepository,
    @Inject(TENANT_MEMBERSHIP_LOOKUP_PORT)
    private readonly tenantMembershipLookupPort: ITenantMembershipLookupPort,
    private readonly tokenService: TokenService,
    private readonly generateRefreshTokenService: GenerateRefreshTokenService,
    private readonly hashRefreshTokenService: HashRefreshTokenService,
    private readonly configService: ConfigService,
  ) {}

  async execute(command: RefreshSessionCommand): Promise<ILoginSessionResult> {
    const presentedHash = this.hashRefreshTokenService.execute(
      command.refreshToken.value,
    );

    const user =
      await this.userWriteRepository.findByRefreshTokenHash(presentedHash);
    if (!user) throw new InvalidRefreshTokenException();

    if (user.isRefreshTokenExpired()) {
      user.revokeRefreshToken();
      await this.userWriteRepository.save(user);
      throw new InvalidRefreshTokenException();
    }

    const tenants =
      await this.tenantMembershipLookupPort.findMembershipsByUserId(
        user.id.value,
      );

    const accessToken = this.tokenService.sign({
      sub: user.id.value,
      email: user.email.value,
      platformAdmin: user.platformAdmin.value,
      tenants,
    });

    const rawRefreshToken = this.generateRefreshTokenService.execute();
    const refreshTokenHash =
      this.hashRefreshTokenService.execute(rawRefreshToken);
    const refreshTokenTtlDays = this.configService.get<number>(
      'auth.refreshTokenTtlDays',
      30,
    );
    const expiresAt = new Date(
      Date.now() + refreshTokenTtlDays * 24 * 60 * 60 * 1000,
    );

    user.issueRefreshToken(refreshTokenHash, expiresAt);
    await this.userWriteRepository.save(user);

    this.logger.log(`Session refreshed for user: ${user.id.value}`);

    return { accessToken, refreshToken: rawRefreshToken };
  }
}
