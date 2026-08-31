import { CreateAppCommand } from '@contexts/tenancy/application/commands/create-app/create-app.command';
import { AssertAppSlugAvailableService } from '@contexts/tenancy/application/services/write/assert-app-slug-available/assert-app-slug-available.service';
import { AppAggregate } from '@contexts/tenancy/domain/aggregates/app.aggregate';
import { AppBuilder } from '@contexts/tenancy/domain/builders/app.builder';
import {
  APP_WRITE_REPOSITORY,
  IAppWriteRepository,
} from '@contexts/tenancy/domain/repositories/write/app-write.repository';
import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { BaseCommandHandler, UuidValueObject } from '@sisques-labs/nestjs-kit';

export interface CreateAppResult {
  appId: string;
  slug: string;
  name: string;
}

@CommandHandler(CreateAppCommand)
export class CreateAppCommandHandler
  extends BaseCommandHandler<CreateAppCommand, AppAggregate>
  implements ICommandHandler<CreateAppCommand>
{
  private readonly logger = new Logger(CreateAppCommandHandler.name);

  constructor(
    @Inject(APP_WRITE_REPOSITORY)
    private readonly appWriteRepository: IAppWriteRepository,
    private readonly assertAppSlugAvailableService: AssertAppSlugAvailableService,
    private readonly appBuilder: AppBuilder,
    eventBus: EventBus,
  ) {
    super(eventBus);
  }

  async execute(command: CreateAppCommand): Promise<CreateAppResult> {
    const { slug, name } = command;

    await this.assertAppSlugAvailableService.execute(slug);

    const now = new Date();
    const app = this.appBuilder
      .withId(UuidValueObject.generate().value)
      .withSlug(slug.value)
      .withName(name.value)
      .withCreatedAt(now)
      .withUpdatedAt(now)
      .build();

    app.create();
    await this.appWriteRepository.save(app);
    await this.publishEvents(app);

    this.logger.log(`App created: ${app.id.value}`);

    return { appId: app.id.value, slug: app.slug.value, name: app.name.value };
  }
}
