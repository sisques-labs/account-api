import { CreateUserCommand } from '@contexts/user/application/commands/create-user/create-user.command';
import { AssertUserEmailAvailableService } from '@contexts/user/application/services/write/assert-user-email-available/assert-user-email-available.service';
import { UserAggregate } from '@contexts/user/domain/aggregates/user.aggregate';
import { UserBuilder } from '@contexts/user/domain/builders/user.builder';
import {
  IUserWriteRepository,
  USER_WRITE_REPOSITORY,
} from '@contexts/user/domain/repositories/write/user-write.repository';
import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { BaseCommandHandler, UuidValueObject } from '@sisques-labs/nestjs-kit';

@CommandHandler(CreateUserCommand)
export class CreateUserCommandHandler
  extends BaseCommandHandler<CreateUserCommand, UserAggregate>
  implements ICommandHandler<CreateUserCommand, string>
{
  private readonly logger = new Logger(CreateUserCommandHandler.name);

  constructor(
    @Inject(USER_WRITE_REPOSITORY)
    private readonly userWriteRepository: IUserWriteRepository,
    private readonly assertUserEmailAvailableService: AssertUserEmailAvailableService,
    private readonly userBuilder: UserBuilder,
    eventBus: EventBus,
  ) {
    super(eventBus);
  }

  async execute(command: CreateUserCommand): Promise<string> {
    const { externalId, email, displayName } = command;

    await this.assertUserEmailAvailableService.execute(email);

    const now = new Date();
    // UserBuilder is a shared singleton (like every DOMAIN_BUILDERS provider
    // in this template) — every optional field MUST be set explicitly on
    // every build, never left to "whatever the builder's internal state
    // happens to be" from a previous call.
    const user = this.userBuilder
      .withId(UuidValueObject.generate().value)
      .withExternalId(externalId.value)
      .withEmail(email.value)
      .withDisplayName(displayName?.value)
      .withPlatformAdmin(false)
      .withCreatedAt(now)
      .withUpdatedAt(now)
      .build();

    user.create();
    await this.userWriteRepository.save(user);
    await this.publishEvents(user);

    this.logger.log(`User created: ${user.id.value}`);

    return user.id.value;
  }
}
