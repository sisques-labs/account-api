import { UuidValueObject } from '@sisques-labs/nestjs-kit';

export interface TenantMembershipFindByUserIdQueryInput {
  userId: string;
}

export class TenantMembershipFindByUserIdQuery {
  public readonly userId: UuidValueObject;

  constructor(input: TenantMembershipFindByUserIdQueryInput) {
    this.userId = new UuidValueObject(input.userId);
  }
}
