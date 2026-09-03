import { ITenantMembershipPrimitives } from '@contexts/tenancy/domain/primitives/tenant-membership.primitives';
import { UuidValueObject } from '@sisques-labs/nestjs-kit';

export type TenantMembershipFindByUserIdQueryInput = Pick<
  ITenantMembershipPrimitives,
  'userId'
>;

export class TenantMembershipFindByUserIdQuery {
  public readonly userId: UuidValueObject;

  constructor(input: TenantMembershipFindByUserIdQueryInput) {
    this.userId = new UuidValueObject(input.userId);
  }
}
