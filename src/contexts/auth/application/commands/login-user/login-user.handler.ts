import { LoginUserCommand } from '@contexts/auth/application/commands/login-user/login-user.command';
import { ILoginSessionResult } from '@contexts/auth/application/commands/login-session-result.interface';
import {
  IDENTITY_PROVIDER_PORT,
  IIdentityProviderPort,
} from '@contexts/auth/application/ports/identity-provider.port';
import {
  ITenantMembershipLookupPort,
  TENANT_MEMBERSHIP_LOOKUP_PORT,
} from '@contexts/auth/application/ports/tenant-membership-lookup.port';
import {
  IUserLookupPort,
  USER_LOOKUP_PORT,
} from '@contexts/auth/application/ports/user-lookup.port';
import { GenerateRefreshTokenService } from '@contexts/auth/application/services/write/generate-refresh-token/generate-refresh-token.service';
import { HashRefreshTokenService } from '@contexts/auth/application/services/write/hash-refresh-token/hash-refresh-token.service';
import { TokenSignService } from '@contexts/auth/application/services/write/token-sign/token-sign.service';
import { SessionBuilder } from '@contexts/auth/domain/builders/session.builder';
import { InvalidCredentialsException } from '@contexts/auth/domain/exceptions/invalid-credentials.exception';
import {
  ISessionWriteRepository,
  SESSION_WRITE_REPOSITORY,
} from '@contexts/auth/domain/repositories/write/session-write.repository';
import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ConfigService } from '@nestjs/config';
import { UuidValueObject } from '@sisques-labs/nestjs-kit';

@CommandHandler(LoginUserCommand)
export class LoginUserCommandHandler implements ICommandHandler<LoginUserCommand> {
  private readonly logger = new Logger(LoginUserCommandHandler.name);

  constructor(
    @Inject(USER_LOOKUP_PORT)
    private readonly userLookupPort: IUserLookupPort,
    @Inject(IDENTITY_PROVIDER_PORT)
    private readonly identityProviderPort: IIdentityProviderPort,
    @Inject(TENANT_MEMBERSHIP_LOOKUP_PORT)
    private readonly tenantMembershipLookupPort: ITenantMembershipLookupPort,
    @Inject(SESSION_WRITE_REPOSITORY)
    private readonly sessionWriteRepository: ISessionWriteRepository,
    private readonly tokenSignService: TokenSignService,
    private readonly generateRefreshTokenService: GenerateRefreshTokenService,
    private readonly hashRefreshTokenService: HashRefreshTokenService,
    private readonly sessionBuilder: SessionBuilder,
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

    const user = await this.userLookupPort.findByEmail(email.value);
    if (!user) throw new InvalidCredentialsException();

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

    // MVP simplification: one active session per user — rotate the
    // existing row in place instead of creating a second one.
    const existingSession = await this.sessionWriteRepository.findByUserId(
      user.userId,
    );
    if (existingSession) {
      existingSession.rotate(refreshTokenHash, expiresAt);
      await this.sessionWriteRepository.save(existingSession);
    } else {
      const now = new Date();
      const session = this.sessionBuilder
        .withId(UuidValueObject.generate().value)
        .withUserId(user.userId)
        .withRefreshTokenHash(refreshTokenHash)
        .withExpiresAt(expiresAt)
        .withCreatedAt(now)
        .withUpdatedAt(now)
        .build();
      await this.sessionWriteRepository.save(session);
    }

    this.logger.log(`User logged in: ${user.userId}`);

    return { accessToken, refreshToken: rawRefreshToken };
  }
}
