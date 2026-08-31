import { LoginUserCommand } from '@contexts/identity/application/commands/login-user/login-user.command';
import {
  IDENTITY_PROVIDER_PORT,
  IIdentityProviderPort,
} from '@contexts/identity/application/ports/identity-provider.port';
import {
  ITenantMembershipLookupPort,
  TENANT_MEMBERSHIP_LOOKUP_PORT,
} from '@contexts/identity/application/ports/tenant-membership-lookup.port';
import { GenerateRefreshTokenService } from '@contexts/identity/application/services/write/generate-refresh-token/generate-refresh-token.service';
import { HashRefreshTokenService } from '@contexts/identity/application/services/write/hash-refresh-token/hash-refresh-token.service';
import { TokenService } from '@contexts/identity/application/services/token.service';
import { InvalidCredentialsException } from '@contexts/identity/domain/exceptions/invalid-credentials.exception';
import {
  IUserWriteRepository,
  USER_WRITE_REPOSITORY,
} from '@contexts/identity/domain/repositories/write/user-write.repository';
import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ConfigService } from '@nestjs/config';

export interface ILoginSessionResult {
  accessToken: string;
  refreshToken: string;
}

@CommandHandler(LoginUserCommand)
export class LoginUserCommandHandler implements ICommandHandler<LoginUserCommand> {
  private readonly logger = new Logger(LoginUserCommandHandler.name);

  constructor(
    @Inject(USER_WRITE_REPOSITORY)
    private readonly userWriteRepository: IUserWriteRepository,
    @Inject(IDENTITY_PROVIDER_PORT)
    private readonly identityProviderPort: IIdentityProviderPort,
    @Inject(TENANT_MEMBERSHIP_LOOKUP_PORT)
    private readonly tenantMembershipLookupPort: ITenantMembershipLookupPort,
    private readonly tokenService: TokenService,
    private readonly generateRefreshTokenService: GenerateRefreshTokenService,
    private readonly hashRefreshTokenService: HashRefreshTokenService,
    private readonly configService: ConfigService,
  ) {}

  async execute(command: LoginUserCommand): Promise<ILoginSessionResult> {
    this.logger.log(`Login user: ${command.email.value}`);

    const { email, password } = command;

    await this.identityProviderPort
      .verifyCredentials({ email: email.value, password: password.value })
      .catch(() => {
        throw new InvalidCredentialsException();
      });

    const user = await this.userWriteRepository.findByEmail(email.value);
    if (!user) throw new InvalidCredentialsException();

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

    this.logger.log(`User logged in: ${user.id.value}`);

    return { accessToken, refreshToken: rawRefreshToken };
  }
}
