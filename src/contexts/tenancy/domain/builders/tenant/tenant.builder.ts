import { TenantAggregate } from '@contexts/tenancy/domain/aggregates/tenant/tenant.aggregate';
import { TenantNameValueObject } from '@contexts/tenancy/domain/value-objects/tenant-name/tenant-name.vo';
import { TenantSlugValueObject } from '@contexts/tenancy/domain/value-objects/tenant-slug/tenant-slug.vo';
import { TenantViewModel } from '@contexts/tenancy/domain/view-models/tenant.view-model';
import { Injectable } from '@nestjs/common';
import {
  BaseBuilder,
  DateValueObject,
  FieldIsRequiredException,
  UuidValueObject,
} from '@sisques-labs/nestjs-kit';

@Injectable()
export class TenantBuilder extends BaseBuilder<
  TenantAggregate,
  TenantViewModel
> {
  private _appId!: string;
  private _name!: string;
  private _slug!: string;

  withAppId(appId: string): this {
    this._appId = appId;
    return this;
  }

  withName(name: string): this {
    this._name = name;
    return this;
  }

  withSlug(slug: string): this {
    this._slug = slug;
    return this;
  }

  public override validate(): void {
    super.validate();
    if (!this._appId) throw new FieldIsRequiredException('appId');
    if (!this._name) throw new FieldIsRequiredException('name');
    if (!this._slug) throw new FieldIsRequiredException('slug');
  }

  public override build(): TenantAggregate {
    this.validate();

    return new TenantAggregate({
      id: new UuidValueObject(this._id),
      appId: new UuidValueObject(this._appId),
      name: new TenantNameValueObject(this._name),
      slug: new TenantSlugValueObject(this._slug),
      createdAt: new DateValueObject(this._createdAt ?? new Date()),
      updatedAt: new DateValueObject(this._updatedAt ?? new Date()),
    });
  }

  public override buildViewModel(): TenantViewModel {
    this.validate();

    return new TenantViewModel({
      id: this._id,
      appId: this._appId,
      name: this._name,
      slug: this._slug,
      createdAt: this._createdAt ?? new Date(),
      updatedAt: this._updatedAt ?? new Date(),
    });
  }
}
