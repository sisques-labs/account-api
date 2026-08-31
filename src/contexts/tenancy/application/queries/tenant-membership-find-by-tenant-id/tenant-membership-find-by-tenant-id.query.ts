import { UuidValueObject } from '@sisques-labs/nestjs-kit';

export interface TenantMembershipFindByTenantIdQueryInput {
  tenantId: string;
}

export class TenantMembershipFindByTenantIdQuery {
  public readonly tenantId: UuidValueObject;

  constructor(input: TenantMembershipFindByTenantIdQueryInput) {
    this.tenantId = new UuidValueObject(input.tenantId);
  }
}
