import { TenantMembershipAggregate } from '@contexts/tenancy/domain/aggregates/tenant-membership.aggregate';
import { TenantMembershipViewModel } from '@contexts/tenancy/domain/view-models/tenant-membership.view-model';
import { TenantRoleValueObject } from '@contexts/tenancy/domain/value-objects/tenant-role/tenant-role.vo';
import { Injectable } from '@nestjs/common';
import {
  BaseBuilder,
  DateValueObject,
  FieldIsRequiredException,
  UuidValueObject,
} from '@sisques-labs/nestjs-kit';

@Injectable()
export class TenantMembershipBuilder extends BaseBuilder<
  TenantMembershipAggregate,
  TenantMembershipViewModel
> {
  private _tenantId!: string;
  private _userId!: string;
  private _role!: string;

  withTenantId(tenantId: string): this {
    this._tenantId = tenantId;
    return this;
  }

  withUserId(userId: string): this {
    this._userId = userId;
    return this;
  }

  withRole(role: string): this {
    this._role = role;
    return this;
  }

  public override validate(): void {
    super.validate();
    if (!this._tenantId) throw new FieldIsRequiredException('tenantId');
    if (!this._userId) throw new FieldIsRequiredException('userId');
    if (!this._role) throw new FieldIsRequiredException('role');
  }

  public override build(): TenantMembershipAggregate {
    this.validate();

    return new TenantMembershipAggregate({
      id: new UuidValueObject(this._id),
      tenantId: new UuidValueObject(this._tenantId),
      userId: new UuidValueObject(this._userId),
      role: new TenantRoleValueObject(this._role),
      createdAt: new DateValueObject(this._createdAt ?? new Date()),
      updatedAt: new DateValueObject(this._updatedAt ?? new Date()),
    });
  }

  public override buildViewModel(): TenantMembershipViewModel {
    this.validate();

    return new TenantMembershipViewModel({
      id: this._id,
      tenantId: this._tenantId,
      userId: this._userId,
      role: this._role,
      createdAt: this._createdAt ?? new Date(),
      updatedAt: this._updatedAt ?? new Date(),
    });
  }
}
