import { TenantMembershipCreatedEvent } from '@contexts/tenancy/domain/events/tenant-membership-created/tenant-membership-created.event';
import { TenantMembershipDeletedEvent } from '@contexts/tenancy/domain/events/tenant-membership-deleted/tenant-membership-deleted.event';
import { TenantMembershipUpdatedEvent } from '@contexts/tenancy/domain/events/tenant-membership-updated/tenant-membership-updated.event';
import { TenantMembershipRoleChangedEvent } from '@contexts/tenancy/domain/events/field-changed/tenant-membership-role-changed/tenant-membership-role-changed.event';
import { ITenantMembership } from '@contexts/tenancy/domain/interfaces/tenant-membership.interface';
import { ITenantMembershipPrimitives } from '@contexts/tenancy/domain/primitives/tenant-membership.primitives';
import { TenantRoleValueObject } from '@contexts/tenancy/domain/value-objects/tenant-role/tenant-role.vo';
import { BaseAggregate, UuidValueObject } from '@sisques-labs/nestjs-kit';

export class TenantMembershipAggregate extends BaseAggregate {
  private readonly _tenantId: UuidValueObject;
  private readonly _userId: UuidValueObject;
  private _role: TenantRoleValueObject;

  constructor(props: ITenantMembership) {
    super(props.id, props.createdAt, props.updatedAt);
    this._tenantId = props.tenantId;
    this._userId = props.userId;
    this._role = props.role;
  }

  public create(): void {
    this.apply(
      new TenantMembershipCreatedEvent(
        this.generateEventMetadata({ name: TenantMembershipCreatedEvent.name }),
        this.toPrimitives(),
      ),
    );
  }

  public update(
    props: Omit<
      Partial<ITenantMembership>,
      'id' | 'tenantId' | 'userId' | 'createdAt' | 'updatedAt'
    >,
  ): void {
    if (props.role !== undefined) {
      this.changeRole(props.role);
    }

    this.apply(
      new TenantMembershipUpdatedEvent(
        this.generateEventMetadata({ name: TenantMembershipUpdatedEvent.name }),
        this.toPrimitives(),
      ),
    );
  }

  public delete(): void {
    this.apply(
      new TenantMembershipDeletedEvent(
        this.generateEventMetadata({ name: TenantMembershipDeletedEvent.name }),
        this.toPrimitives(),
      ),
    );
  }

  private changeRole(role: TenantRoleValueObject): void {
    const oldValue = this._role.value;
    const newValue = role.value;

    if (oldValue === newValue) return;

    this._role = role;

    this.touch();

    this.apply(
      new TenantMembershipRoleChangedEvent(
        this.generateEventMetadata({
          name: TenantMembershipRoleChangedEvent.name,
        }),
        {
          id: this._id.value,
          oldValue: oldValue,
          newValue: newValue,
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
