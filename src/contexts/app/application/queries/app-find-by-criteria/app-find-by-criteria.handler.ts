import { AppFindByCriteriaQuery } from '@contexts/app/application/queries/app-find-by-criteria/app-find-by-criteria.query';
import {
  APP_READ_REPOSITORY,
  IAppReadRepository,
} from '@contexts/app/domain/repositories/read/app-read.repository';
import { AppViewModel } from '@contexts/app/domain/view-models/app.view-model';
import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PaginatedResult } from '@sisques-labs/nestjs-kit';

@QueryHandler(AppFindByCriteriaQuery)
export class AppFindByCriteriaQueryHandler implements IQueryHandler<AppFindByCriteriaQuery> {
  private readonly logger = new Logger(AppFindByCriteriaQueryHandler.name);

  constructor(
    @Inject(APP_READ_REPOSITORY)
    private readonly appReadRepository: IAppReadRepository,
  ) {}

  async execute(
    query: AppFindByCriteriaQuery,
  ): Promise<PaginatedResult<AppViewModel>> {
    this.logger.log(
      `Finding apps by criteria: ${JSON.stringify(query.criteria)}`,
    );
    return this.appReadRepository.findByCriteria(query.criteria);
  }
}
