import { ITenantMembershipClaim } from '@contexts/identity/application/ports/tenant-membership-claim.interface';
import { ITenantMembershipLookupPort } from '@contexts/identity/application/ports/tenant-membership-lookup.port';
import { TenantMembershipFindByUserIdQuery } from '@contexts/tenancy/application/queries/tenant-membership-find-by-user-id/tenant-membership-find-by-user-id.query';
import { TenantMembershipViewModel } from '@contexts/tenancy/domain/view-models/tenant-membership.view-model';
import { Injectable, Logger } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';

/**
 * Cross-context adapter: identity -> tenancy. Dispatches via QueryBus only
 * — never imports tenancy's domain/application directly outside this
 * `infrastructure/adapters/` file (boundary rule).
 */
@Injectable()
export class TenantMembershipLookupAdapter implements ITenantMembershipLookupPort {
  private readonly logger = new Logger(TenantMembershipLookupAdapter.name);

  constructor(private readonly queryBus: QueryBus) {}

  async findMembershipsByUserId(
    userId: string,
  ): Promise<ITenantMembershipClaim[]> {
    this.logger.log(`Looking up tenant memberships for user: ${userId}`);

    const memberships = await this.queryBus.execute<
      TenantMembershipFindByUserIdQuery,
      TenantMembershipViewModel[]
    >(new TenantMembershipFindByUserIdQuery({ userId }));

    return memberships.map((membership) => ({
      tenantId: membership.tenantId,
      role: membership.role,
    }));
  }
}
