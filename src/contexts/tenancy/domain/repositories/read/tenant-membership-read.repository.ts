import { TenantMembershipViewModel } from '@contexts/tenancy/domain/view-models/tenant-membership.view-model';
import { IBaseReadRepository } from '@sisques-labs/nestjs-kit';

export const TENANT_MEMBERSHIP_READ_REPOSITORY = Symbol(
  'TENANT_MEMBERSHIP_READ_REPOSITORY',
);

export interface ITenantMembershipReadRepository extends IBaseReadRepository<TenantMembershipViewModel> {
  findAllByTenantId(tenantId: string): Promise<TenantMembershipViewModel[]>;
  findAllByUserId(userId: string): Promise<TenantMembershipViewModel[]>;
}
