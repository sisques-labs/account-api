import { IUserPlatformAdminPort } from '@contexts/auth/application/ports/user-platform-admin.port';
import { SetUserPlatformAdminCommand } from '@contexts/user/application/commands/set-user-platform-admin/set-user-platform-admin.command';
import { Injectable, Logger } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';

/**
 * Cross-context adapter: auth -> user. Dispatches
 * `SetUserPlatformAdminCommand` via `CommandBus` — never imports user's
 * domain/application directly outside this `infrastructure/adapters/` file
 * (boundary rule), mirroring `UserProvisioningAdapter`.
 */
@Injectable()
export class UserPlatformAdminAdapter implements IUserPlatformAdminPort {
  private readonly logger = new Logger(UserPlatformAdminAdapter.name);

  constructor(private readonly commandBus: CommandBus) {}

  async setPlatformAdmin(
    userId: string,
    platformAdmin: boolean,
  ): Promise<void> {
    this.logger.log(
      `Reconciling platformAdmin=${platformAdmin} for user: ${userId}`,
    );

    await this.commandBus.execute(
      new SetUserPlatformAdminCommand({ userId, platformAdmin }),
    );
  }
}
