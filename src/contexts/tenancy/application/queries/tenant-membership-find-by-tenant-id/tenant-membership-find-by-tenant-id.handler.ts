import { TenantMembershipFindByTenantIdQuery } from '@contexts/tenancy/application/queries/tenant-membership-find-by-tenant-id/tenant-membership-find-by-tenant-id.query';
import { AssertTenantExistsService } from '@contexts/tenancy/application/services/write/assert-tenant-exists/assert-tenant-exists.service';
import {
  ITenantMembershipReadRepository,
  TENANT_MEMBERSHIP_READ_REPOSITORY,
} from '@contexts/tenancy/domain/repositories/read/tenant-membership-read.repository';
import { TenantMembershipViewModel } from '@contexts/tenancy/domain/view-models/tenant-membership.view-model';
import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

@QueryHandler(TenantMembershipFindByTenantIdQuery)
export class TenantMembershipFindByTenantIdQueryHandler implements IQueryHandler<TenantMembershipFindByTenantIdQuery> {
  private readonly logger = new Logger(
    TenantMembershipFindByTenantIdQueryHandler.name,
  );

  constructor(
    @Inject(TENANT_MEMBERSHIP_READ_REPOSITORY)
    private readonly tenantMembershipReadRepository: ITenantMembershipReadRepository,
    private readonly assertTenantExistsService: AssertTenantExistsService,
  ) {}

  async execute(
    query: TenantMembershipFindByTenantIdQuery,
  ): Promise<TenantMembershipViewModel[]> {
    this.logger.log(`Finding members of tenant: ${query.tenantId.value}`);
    await this.assertTenantExistsService.execute(query.tenantId);
    return this.tenantMembershipReadRepository.findAllByTenantId(
      query.tenantId.value,
    );
  }
}
