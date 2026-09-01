import { TenantAggregate } from '@contexts/tenancy/domain/aggregates/tenant/tenant.aggregate';
import { IBaseWriteRepository } from '@sisques-labs/nestjs-kit';

export const TENANT_WRITE_REPOSITORY = Symbol('TENANT_WRITE_REPOSITORY');

export interface ITenantWriteRepository extends IBaseWriteRepository<TenantAggregate> {
  findByAppIdAndSlug(
    appId: string,
    slug: string,
  ): Promise<TenantAggregate | null>;
}
