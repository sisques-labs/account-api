import { SetUserPlatformAdminCommand } from '@contexts/user/application/commands/set-user-platform-admin/set-user-platform-admin.command';
import { AssertUserExistsService } from '@contexts/user/application/services/write/assert-user-exists/assert-user-exists.service';
import { UserAggregate } from '@contexts/user/domain/aggregates/user.aggregate';
import {
  IUserWriteRepository,
  USER_WRITE_REPOSITORY,
} from '@contexts/user/domain/repositories/write/user-write.repository';
import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { BaseCommandHandler } from '@sisques-labs/nestjs-kit';

@CommandHandler(SetUserPlatformAdminCommand)
export class SetUserPlatformAdminCommandHandler
  extends BaseCommandHandler<SetUserPlatformAdminCommand, UserAggregate>
  implements ICommandHandler<SetUserPlatformAdminCommand, void>
{
  private readonly logger = new Logger(SetUserPlatformAdminCommandHandler.name);

  constructor(
    private readonly assertUserExistsService: AssertUserExistsService,
    @Inject(USER_WRITE_REPOSITORY)
    private readonly userWriteRepository: IUserWriteRepository,
    eventBus: EventBus,
  ) {
    super(eventBus);
  }

  async execute(command: SetUserPlatformAdminCommand): Promise<void> {
    const { userId, platformAdmin } = command;

    const user = await this.assertUserExistsService.execute(userId);

    if (user.platformAdmin.value === platformAdmin.value) {
      this.logger.log(
        `User platformAdmin already ${platformAdmin.value}, skipping: ${userId.value}`,
      );
      return;
    }

    user.update({ platformAdmin });
    await this.userWriteRepository.save(user);
    await this.publishEvents(user);

    this.logger.log(
      `User platformAdmin set to ${platformAdmin.value}: ${userId.value}`,
    );
  }
}
