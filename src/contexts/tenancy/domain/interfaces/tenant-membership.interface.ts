import { TenantRoleValueObject } from '@contexts/tenancy/domain/value-objects/tenant-role/tenant-role.vo';
import { DateValueObject, UuidValueObject } from '@sisques-labs/nestjs-kit';

export interface ITenantMembership {
  id: UuidValueObject;
  tenantId: UuidValueObject;
  userId: UuidValueObject;
  role: TenantRoleValueObject;
  createdAt: DateValueObject;
  updatedAt: DateValueObject;
}
