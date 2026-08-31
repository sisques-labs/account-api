import { TenantMembershipCreatedEvent } from '@contexts/tenancy/domain/events/tenant-membership-created/tenant-membership-created.event';
import { ITenantMembership } from '@contexts/tenancy/domain/interfaces/tenant-membership.interface';
import { ITenantMembershipPrimitives } from '@contexts/tenancy/domain/primitives/tenant-membership.primitives';
import { TenantRoleValueObject } from '@contexts/tenancy/domain/value-objects/tenant-role/tenant-role.vo';
import { BaseAggregate, UuidValueObject } from '@sisques-labs/nestjs-kit';

export class TenantMembershipAggregate extends BaseAggregate {
  private readonly _id: UuidValueObject;
  private readonly _tenantId: UuidValueObject;
  private readonly _userId: UuidValueObject;
  private readonly _role: TenantRoleValueObject;

  constructor(props: ITenantMembership) {
    super(props.createdAt, props.updatedAt);
    this._id = props.id;
    this._tenantId = props.tenantId;
    this._userId = props.userId;
    this._role = props.role;
  }

  public create(): void {
    this.apply(
      new TenantMembershipCreatedEvent(
        {
          aggregateRootId: this._id.value,
          aggregateRootType: TenantMembershipAggregate.name,
          entityId: this._id.value,
          entityType: TenantMembershipAggregate.name,
          eventType: TenantMembershipCreatedEvent.name,
        },
        {
          id: this._id.value,
          tenantId: this._tenantId.value,
          userId: this._userId.value,
          role: this._role.value,
        },
      ),
    );
  }

  get id(): UuidValueObject {
    return this._id;
  }

  get tenantId(): UuidValueObject {
    return this._tenantId;
  }

  get userId(): UuidValueObject {
    return this._userId;
  }

  get role(): TenantRoleValueObject {
    return this._role;
  }

  toPrimitives(): ITenantMembershipPrimitives {
    return {
      id: this._id.value,
      tenantId: this._tenantId.value,
      userId: this._userId.value,
      role: this._role.value,
      createdAt: this.createdAt.value,
      updatedAt: this.updatedAt.value,
    };
  }
}
