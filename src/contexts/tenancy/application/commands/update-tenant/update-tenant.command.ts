import { ITenantPrimitives } from '@contexts/tenancy/domain/primitives/tenant.primitives';
import { TenantNameValueObject } from '@contexts/tenancy/domain/value-objects/tenant-name/tenant-name.vo';
import { TenantSlugValueObject } from '@contexts/tenancy/domain/value-objects/tenant-slug/tenant-slug.vo';
import { UuidValueObject } from '@sisques-labs/nestjs-kit';

export type UpdateTenantCommandInput = {
  tenantId: string;
  requesterUserId: string;
} & Partial<Pick<ITenantPrimitives, 'name' | 'slug'>>;

export class UpdateTenantCommand {
  public readonly tenantId: UuidValueObject;
  public readonly requesterUserId: UuidValueObject;
  public readonly name?: TenantNameValueObject;
  public readonly slug?: TenantSlugValueObject;

  constructor(input: UpdateTenantCommandInput) {
    this.tenantId = new UuidValueObject(input.tenantId);
    this.requesterUserId = new UuidValueObject(input.requesterUserId);
    this.name =
      input.name !== undefined
        ? new TenantNameValueObject(input.name)
        : undefined;
    this.slug =
      input.slug !== undefined
        ? new TenantSlugValueObject(input.slug)
        : undefined;
  }
}
