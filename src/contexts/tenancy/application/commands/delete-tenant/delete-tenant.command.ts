import { UuidValueObject } from '@sisques-labs/nestjs-kit';

export interface DeleteTenantCommandInput {
  tenantId: string;
  requesterUserId: string;
}

export class DeleteTenantCommand {
  public readonly tenantId: UuidValueObject;
  public readonly requesterUserId: UuidValueObject;

  constructor(input: DeleteTenantCommandInput) {
    this.tenantId = new UuidValueObject(input.tenantId);
    this.requesterUserId = new UuidValueObject(input.requesterUserId);
  }
}
