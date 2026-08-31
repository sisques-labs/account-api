import { IUserProvisioningInput } from '@contexts/auth/application/ports/user-provisioning-input.interface';
import { IUserProvisioningResult } from '@contexts/auth/application/ports/user-provisioning-result.interface';
import { IUserProvisioningPort } from '@contexts/auth/application/ports/user-provisioning.port';
import { CreateUserCommand } from '@contexts/user/application/commands/create-user/create-user.command';
import { Injectable, Logger } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';

/**
 * Cross-context adapter: auth -> user. Dispatches `CreateUserCommand` via
 * `CommandBus` — never imports user's domain/application directly outside
 * this `infrastructure/adapters/` file (boundary rule). First
 * command-dispatching cross-context adapter in this codebase (existing ones
 * are query-only) — still within the same rule, just exercising the
 * command half of it.
 */
@Injectable()
export class UserProvisioningAdapter implements IUserProvisioningPort {
  private readonly logger = new Logger(UserProvisioningAdapter.name);

  constructor(private readonly commandBus: CommandBus) {}

  async createUser(
    input: IUserProvisioningInput,
  ): Promise<IUserProvisioningResult> {
    this.logger.log(`Provisioning local user for email: ${input.email}`);

    const userId = await this.commandBus.execute<CreateUserCommand, string>(
      new CreateUserCommand(input),
    );

    return { userId };
  }
}
