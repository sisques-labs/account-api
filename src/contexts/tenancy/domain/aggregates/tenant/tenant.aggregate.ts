import { TenantCreatedEvent } from '@contexts/tenancy/domain/events/tenant-created/tenant-created.event';
import { ITenant } from '@contexts/tenancy/domain/interfaces/tenant.interface';
import { ITenantPrimitives } from '@contexts/tenancy/domain/primitives/tenant.primitives';
import { TenantNameValueObject } from '@contexts/tenancy/domain/value-objects/tenant-name/tenant-name.vo';
import { TenantSlugValueObject } from '@contexts/tenancy/domain/value-objects/tenant-slug/tenant-slug.vo';
import { BaseAggregate, UuidValueObject } from '@sisques-labs/nestjs-kit';

export class TenantAggregate extends BaseAggregate {
  private readonly _id: UuidValueObject;
  private readonly _appId: UuidValueObject;
  private readonly _name: TenantNameValueObject;
  private readonly _slug: TenantSlugValueObject;

  constructor(props: ITenant) {
    super(props.createdAt, props.updatedAt);
    this._id = props.id;
    this._appId = props.appId;
    this._name = props.name;
    this._slug = props.slug;
  }

  public create(): void {
    this.apply(
      new TenantCreatedEvent(
        {
          aggregateRootId: this._id.value,
          aggregateRootType: TenantAggregate.name,
          entityId: this._id.value,
          entityType: TenantAggregate.name,
          eventType: TenantCreatedEvent.name,
        },
        {
          id: this._id.value,
          appId: this._appId.value,
          name: this._name.value,
          slug: this._slug.value,
        },
      ),
    );
  }

  get id(): UuidValueObject {
    return this._id;
  }

  get appId(): UuidValueObject {
    return this._appId;
  }

  get name(): TenantNameValueObject {
    return this._name;
  }

  get slug(): TenantSlugValueObject {
    return this._slug;
  }

  toPrimitives(): ITenantPrimitives {
    return {
      id: this._id.value,
      appId: this._appId.value,
      name: this._name.value,
      slug: this._slug.value,
      createdAt: this.createdAt.value,
      updatedAt: this.updatedAt.value,
    };
  }
}
