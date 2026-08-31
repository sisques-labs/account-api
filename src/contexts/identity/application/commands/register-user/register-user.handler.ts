import { RegisterUserCommand } from '@contexts/identity/application/commands/register-user/register-user.command';
import {
  IDENTITY_PROVIDER_PORT,
  IIdentityProviderPort,
} from '@contexts/identity/application/ports/identity-provider.port';
import { AssertUserEmailAvailableService } from '@contexts/identity/application/services/write/assert-user-email-available/assert-user-email-available.service';
import { UserAggregate } from '@contexts/identity/domain/aggregates/user.aggregate';
import { UserBuilder } from '@contexts/identity/domain/builders/user.builder';
import {
  IUserWriteRepository,
  USER_WRITE_REPOSITORY,
} from '@contexts/identity/domain/repositories/write/user-write.repository';
import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { BaseCommandHandler, UuidValueObject } from '@sisques-labs/nestjs-kit';

export interface RegisterUserResult {
  userId: string;
  email: string;
  displayName: string;
}

@CommandHandler(RegisterUserCommand)
export class RegisterUserCommandHandler
  extends BaseCommandHandler<RegisterUserCommand, UserAggregate>
  implements ICommandHandler<RegisterUserCommand>
{
  private readonly logger = new Logger(RegisterUserCommandHandler.name);

  constructor(
    @Inject(USER_WRITE_REPOSITORY)
    private readonly userWriteRepository: IUserWriteRepository,
    @Inject(IDENTITY_PROVIDER_PORT)
    private readonly identityProviderPort: IIdentityProviderPort,
    private readonly assertUserEmailAvailableService: AssertUserEmailAvailableService,
    private readonly userBuilder: UserBuilder,
    eventBus: EventBus,
  ) {
    super(eventBus);
  }

  async execute(command: RegisterUserCommand): Promise<RegisterUserResult> {
    const { email, password, displayName } = command;

    await this.assertUserEmailAvailableService.execute(email);

    const { externalId } = await this.identityProviderPort.registerIdentity({
      email: email.value,
      password: password.value,
      displayName: displayName.value,
    });

    const now = new Date();
    // UserBuilder is a shared singleton (like every DOMAIN_BUILDERS
    // provider in this template) — every optional field MUST be set
    // explicitly on every build, never left to "whatever the builder's
    // internal state happens to be" from a previous call (e.g. the mapper
    // hydrating an existing user with a real refresh token hash).
    const user = this.userBuilder
      .withId(UuidValueObject.generate().value)
      .withExternalId(externalId)
      .withEmail(email.value)
      .withDisplayName(displayName.value)
      .withPlatformAdmin(false)
      .withRefreshTokenHash(null)
      .withRefreshTokenExpiresAt(null)
      .withCreatedAt(now)
      .withUpdatedAt(now)
      .build();

    user.create();
    await this.userWriteRepository.save(user);
    await this.publishEvents(user);

    this.logger.log(`User registered: ${user.id.value}`);

    return {
      userId: user.id.value,
      email: user.email.value,
      displayName: user.displayName.value,
    };
  }
}
