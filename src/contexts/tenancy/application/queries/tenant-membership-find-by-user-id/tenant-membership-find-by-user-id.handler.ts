import { TenantMembershipFindByUserIdQuery } from '@contexts/tenancy/application/queries/tenant-membership-find-by-user-id/tenant-membership-find-by-user-id.query';
import {
  ITenantMembershipReadRepository,
  TENANT_MEMBERSHIP_READ_REPOSITORY,
} from '@contexts/tenancy/domain/repositories/read/tenant-membership-read.repository';
import { TenantMembershipViewModel } from '@contexts/tenancy/domain/view-models/tenant-membership.view-model';
import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

/**
 * Consumed cross-context by identity's `TenantMembershipLookupAdapter` (via
 * QueryBus) to embed tenant/role claims in the access token.
 */
@QueryHandler(TenantMembershipFindByUserIdQuery)
export class TenantMembershipFindByUserIdQueryHandler implements IQueryHandler<TenantMembershipFindByUserIdQuery> {
  private readonly logger = new Logger(
    TenantMembershipFindByUserIdQueryHandler.name,
  );

  constructor(
    @Inject(TENANT_MEMBERSHIP_READ_REPOSITORY)
    private readonly tenantMembershipReadRepository: ITenantMembershipReadRepository,
  ) {}

  async execute(
    query: TenantMembershipFindByUserIdQuery,
  ): Promise<TenantMembershipViewModel[]> {
    this.logger.log(`Finding memberships for user: ${query.userId.value}`);
    return this.tenantMembershipReadRepository.findAllByUserId(
      query.userId.value,
    );
  }
}
