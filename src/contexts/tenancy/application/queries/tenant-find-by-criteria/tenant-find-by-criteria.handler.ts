import { TenantFindByCriteriaQuery } from '@contexts/tenancy/application/queries/tenant-find-by-criteria/tenant-find-by-criteria.query';
import {
  ITenantReadRepository,
  TENANT_READ_REPOSITORY,
} from '@contexts/tenancy/domain/repositories/read/tenant-read.repository';
import { TenantViewModel } from '@contexts/tenancy/domain/view-models/tenant.view-model';
import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PaginatedResult } from '@sisques-labs/nestjs-kit';

@QueryHandler(TenantFindByCriteriaQuery)
export class TenantFindByCriteriaQueryHandler implements IQueryHandler<TenantFindByCriteriaQuery> {
  private readonly logger = new Logger(TenantFindByCriteriaQueryHandler.name);

  constructor(
    @Inject(TENANT_READ_REPOSITORY)
    private readonly tenantReadRepository: ITenantReadRepository,
  ) {}

  async execute(
    query: TenantFindByCriteriaQuery,
  ): Promise<PaginatedResult<TenantViewModel>> {
    this.logger.log(
      `Finding tenants by criteria: ${JSON.stringify(query.criteria)}`,
    );
    return this.tenantReadRepository.findByCriteria(query.criteria);
  }
}
