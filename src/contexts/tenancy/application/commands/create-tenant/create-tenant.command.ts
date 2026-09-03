import { TenantNameValueObject } from '@contexts/tenancy/domain/value-objects/tenant-name/tenant-name.vo';
import { TenantSlugValueObject } from '@contexts/tenancy/domain/value-objects/tenant-slug/tenant-slug.vo';
import { SlugValueObject, UuidValueObject } from '@sisques-labs/nestjs-kit';

export interface CreateTenantCommandInput {
  appId: string;
  name: string;
  /** Optional — derived from `name` when omitted. */
  slug?: string;
  creatorUserId: string;
}

export class CreateTenantCommand {
  public readonly appId: UuidValueObject;
  public readonly name: TenantNameValueObject;
  public readonly slug: TenantSlugValueObject;
  public readonly creatorUserId: UuidValueObject;

  constructor(input: CreateTenantCommandInput) {
    this.appId = new UuidValueObject(input.appId);
    this.name = new TenantNameValueObject(input.name);
    this.slug = new TenantSlugValueObject(
      input.slug ?? SlugValueObject.generateSlug(input.name),
    );
    this.creatorUserId = new UuidValueObject(input.creatorUserId);
  }
}
