import { AppFindAllQuery } from '@contexts/app/application/queries/app-find-all/app-find-all.query';
import {
  APP_READ_REPOSITORY,
  IAppReadRepository,
} from '@contexts/app/domain/repositories/read/app-read.repository';
import { AppViewModel } from '@contexts/app/domain/view-models/app.view-model';
import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Criteria } from '@sisques-labs/nestjs-kit';

@QueryHandler(AppFindAllQuery)
export class AppFindAllQueryHandler implements IQueryHandler<AppFindAllQuery> {
  private readonly logger = new Logger(AppFindAllQueryHandler.name);

  constructor(
    @Inject(APP_READ_REPOSITORY)
    private readonly appReadRepository: IAppReadRepository,
  ) {}

  async execute(): Promise<AppViewModel[]> {
    this.logger.log('Finding all apps');
    const result = await this.appReadRepository.findByCriteria(
      new Criteria([], [], { page: 1, perPage: 100 }),
    );
    return result.items;
  }
}
