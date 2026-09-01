import { TenantNameValueObject } from '@contexts/tenancy/domain/value-objects/tenant-name/tenant-name.vo';
import { TenantSlugValueObject } from '@contexts/tenancy/domain/value-objects/tenant-slug/tenant-slug.vo';
import { IBaseAggregate, UuidValueObject } from '@sisques-labs/nestjs-kit';

export interface ITenant extends IBaseAggregate {
  appId: UuidValueObject;
  name: TenantNameValueObject;
  slug: TenantSlugValueObject;
}
