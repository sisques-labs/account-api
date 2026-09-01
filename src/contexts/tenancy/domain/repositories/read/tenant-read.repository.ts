import { TenantViewModel } from '@contexts/tenancy/domain/view-models/tenant.view-model';
import { IBaseReadRepository } from '@sisques-labs/nestjs-kit';

export const TENANT_READ_REPOSITORY = Symbol('TENANT_READ_REPOSITORY');

export type ITenantReadRepository = IBaseReadRepository<TenantViewModel>;
