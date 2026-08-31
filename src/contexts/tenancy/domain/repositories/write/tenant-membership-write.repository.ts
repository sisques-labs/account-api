import { TenantMembershipAggregate } from '@contexts/tenancy/domain/aggregates/tenant-membership.aggregate';
import { IBaseWriteRepository } from '@sisques-labs/nestjs-kit';

export const TENANT_MEMBERSHIP_WRITE_REPOSITORY = Symbol(
  'TENANT_MEMBERSHIP_WRITE_REPOSITORY',
);

export interface ITenantMembershipWriteRepository extends IBaseWriteRepository<TenantMembershipAggregate> {
  findByTenantIdAndUserId(
    tenantId: string,
    userId: string,
  ): Promise<TenantMembershipAggregate | null>;
}
