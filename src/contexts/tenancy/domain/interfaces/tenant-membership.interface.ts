import { TenantRoleValueObject } from '@contexts/tenancy/domain/value-objects/tenant-role/tenant-role.vo';
import { IBaseAggregate, UuidValueObject } from '@sisques-labs/nestjs-kit';

export interface ITenantMembership extends IBaseAggregate {
  tenantId: UuidValueObject;
  userId: UuidValueObject;
  role: TenantRoleValueObject;
}
