import { AppFindByIdQuery } from '@contexts/app/application/queries/app-find-by-id/app-find-by-id.query';
import {
  APP_READ_REPOSITORY,
  IAppReadRepository,
} from '@contexts/app/domain/repositories/read/app-read.repository';
import { AppViewModel } from '@contexts/app/domain/view-models/app.view-model';
import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

@QueryHandler(AppFindByIdQuery)
export class AppFindByIdQueryHandler implements IQueryHandler<AppFindByIdQuery> {
  private readonly logger = new Logger(AppFindByIdQueryHandler.name);

  constructor(
    @Inject(APP_READ_REPOSITORY)
    private readonly appReadRepository: IAppReadRepository,
  ) {}

  async execute(query: AppFindByIdQuery): Promise<AppViewModel | null> {
    this.logger.log(`Finding app by id: ${query.id}`);
    return this.appReadRepository.findById(query.id);
  }
}
