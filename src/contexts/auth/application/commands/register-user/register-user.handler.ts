import { RegisterUserCommand } from '@contexts/auth/application/commands/register-user/register-user.command';
import {
  IDENTITY_PROVIDER_PORT,
  IIdentityProviderPort,
} from '@contexts/auth/application/ports/identity-provider.port';
import {
  IUserLookupPort,
  USER_LOOKUP_PORT,
} from '@contexts/auth/application/ports/user-lookup.port';
import {
  IUserProvisioningPort,
  USER_PROVISIONING_PORT,
} from '@contexts/auth/application/ports/user-provisioning.port';
import { EmailAlreadyRegisteredException } from '@contexts/auth/domain/exceptions/email-already-registered.exception';
import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

export interface RegisterUserResult {
  userId: string;
}

@CommandHandler(RegisterUserCommand)
export class RegisterUserCommandHandler implements ICommandHandler<RegisterUserCommand> {
  private readonly logger = new Logger(RegisterUserCommandHandler.name);

  constructor(
    @Inject(USER_LOOKUP_PORT)
    private readonly userLookupPort: IUserLookupPort,
    @Inject(IDENTITY_PROVIDER_PORT)
    private readonly identityProviderPort: IIdentityProviderPort,
    @Inject(USER_PROVISIONING_PORT)
    private readonly userProvisioningPort: IUserProvisioningPort,
  ) {}

  async execute(command: RegisterUserCommand): Promise<RegisterUserResult> {
    const { email, password, displayName } = command;

    // Pre-check before calling Keycloak — avoids orphaning an external
    // identity when the local email is already taken.
    const existing = await this.userLookupPort.findByEmail(email.value);
    if (existing) throw new EmailAlreadyRegisteredException(email.value);

    const { externalId } = await this.identityProviderPort.registerIdentity({
      email: email.value,
      password: password.value,
      displayName: displayName?.value,
    });

    const user = await this.userProvisioningPort.createUser({
      externalId,
      email: email.value,
      displayName: displayName?.value,
    });

    this.logger.log(`User registered: ${user.userId}`);

    return { userId: user.userId };
  }
}
