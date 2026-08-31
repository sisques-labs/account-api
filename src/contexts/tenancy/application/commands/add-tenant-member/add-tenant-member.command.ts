import { TenantRoleValueObject } from '@contexts/tenancy/domain/value-objects/tenant-role/tenant-role.vo';
import { EmailValueObject, UuidValueObject } from '@sisques-labs/nestjs-kit';

export interface AddTenantMemberCommandInput {
  tenantId: string;
  email: string;
  role: string;
}

export class AddTenantMemberCommand {
  public readonly tenantId: UuidValueObject;
  public readonly email: EmailValueObject;
  public readonly role: TenantRoleValueObject;

  constructor(input: AddTenantMemberCommandInput) {
    this.tenantId = new UuidValueObject(input.tenantId);
    this.email = new EmailValueObject(input.email);
    this.role = new TenantRoleValueObject(input.role);
  }
}
