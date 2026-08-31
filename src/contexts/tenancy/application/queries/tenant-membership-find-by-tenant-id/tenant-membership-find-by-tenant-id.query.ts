import { ITenantMembershipPrimitives } from '@contexts/tenancy/domain/primitives/tenant-membership.primitives';
import { UuidValueObject } from '@sisques-labs/nestjs-kit';

export type TenantMembershipFindByTenantIdQueryInput = Pick<
  ITenantMembershipPrimitives,
  'tenantId'
>;

export class TenantMembershipFindByTenantIdQuery {
  public readonly tenantId: UuidValueObject;

  constructor(input: TenantMembershipFindByTenantIdQueryInput) {
    this.tenantId = new UuidValueObject(input.tenantId);
  }
}
