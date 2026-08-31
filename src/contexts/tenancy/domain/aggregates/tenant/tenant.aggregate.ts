import { TenantCreatedEvent } from '@contexts/tenancy/domain/events/tenant-created/tenant-created.event';
import { TenantDeletedEvent } from '@contexts/tenancy/domain/events/tenant-deleted/tenant-deleted.event';
import { TenantUpdatedEvent } from '@contexts/tenancy/domain/events/tenant-updated/tenant-updated.event';
import { TenantNameChangedEvent } from '@contexts/tenancy/domain/events/field-changed/tenant-name-changed/tenant-name-changed.event';
import { TenantSlugChangedEvent } from '@contexts/tenancy/domain/events/field-changed/tenant-slug-changed/tenant-slug-changed.event';
import { ITenant } from '@contexts/tenancy/domain/interfaces/tenant.interface';
import { ITenantPrimitives } from '@contexts/tenancy/domain/primitives/tenant.primitives';
import { TenantNameValueObject } from '@contexts/tenancy/domain/value-objects/tenant-name/tenant-name.vo';
import { TenantSlugValueObject } from '@contexts/tenancy/domain/value-objects/tenant-slug/tenant-slug.vo';
import { BaseAggregate, UuidValueObject } from '@sisques-labs/nestjs-kit';

export class TenantAggregate extends BaseAggregate {
  private readonly _id: UuidValueObject;
  private readonly _appId: UuidValueObject;
  private _name: TenantNameValueObject;
  private _slug: TenantSlugValueObject;

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
        this.toPrimitives(),
      ),
    );
  }

  public update(
    props: Omit<Partial<ITenant>, 'id' | 'appId' | 'createdAt' | 'updatedAt'>,
  ): void {
    if (props.name !== undefined) {
      this.changeName(props.name);
    }

    if (props.slug !== undefined) {
      this.changeSlug(props.slug);
    }

    this.apply(
      new TenantUpdatedEvent(
        {
          aggregateRootId: this._id.value,
          aggregateRootType: TenantAggregate.name,
          entityId: this._id.value,
          entityType: TenantAggregate.name,
          eventType: TenantUpdatedEvent.name,
        },
        this.toPrimitives(),
      ),
    );
  }

  public delete(): void {
    this.apply(
      new TenantDeletedEvent(
        {
          aggregateRootId: this._id.value,
          aggregateRootType: TenantAggregate.name,
          entityId: this._id.value,
          entityType: TenantAggregate.name,
          eventType: TenantDeletedEvent.name,
        },
        this.toPrimitives(),
      ),
    );
  }

  private changeName(name: TenantNameValueObject): void {
    const oldValue = this._name.value;
    const newValue = name.value;

    if (oldValue === newValue) return;

    this._name = name;

    this.touch();

    this.apply(
      new TenantNameChangedEvent(
        {
          aggregateRootId: this._id.value,
          aggregateRootType: TenantAggregate.name,
          entityId: this._id.value,
          entityType: TenantAggregate.name,
          eventType: TenantNameChangedEvent.name,
        },
        {
          id: this._id.value,
          oldValue: oldValue,
          newValue: newValue,
        },
      ),
    );
  }

  private changeSlug(slug: TenantSlugValueObject): void {
    const oldValue = this._slug.value;
    const newValue = slug.value;

    if (oldValue === newValue) return;

    this._slug = slug;

    this.touch();

    this.apply(
      new TenantSlugChangedEvent(
        {
          aggregateRootId: this._id.value,
          aggregateRootType: TenantAggregate.name,
          entityId: this._id.value,
          entityType: TenantAggregate.name,
          eventType: TenantSlugChangedEvent.name,
        },
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
