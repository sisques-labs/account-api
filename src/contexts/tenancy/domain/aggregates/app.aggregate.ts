import { AppCreatedEvent } from '@contexts/tenancy/domain/events/app-created/app-created.event';
import { IApp } from '@contexts/tenancy/domain/interfaces/app.interface';
import { IAppPrimitives } from '@contexts/tenancy/domain/primitives/app.primitives';
import { AppNameValueObject } from '@contexts/tenancy/domain/value-objects/app-name/app-name.vo';
import { AppSlugValueObject } from '@contexts/tenancy/domain/value-objects/app-slug/app-slug.vo';
import { BaseAggregate, UuidValueObject } from '@sisques-labs/nestjs-kit';

export class AppAggregate extends BaseAggregate {
  private readonly _id: UuidValueObject;
  private readonly _slug: AppSlugValueObject;
  private readonly _name: AppNameValueObject;

  constructor(props: IApp) {
    super(props.createdAt, props.updatedAt);
    this._id = props.id;
    this._slug = props.slug;
    this._name = props.name;
  }

  public create(): void {
    this.apply(
      new AppCreatedEvent(
        {
          aggregateRootId: this._id.value,
          aggregateRootType: AppAggregate.name,
          entityId: this._id.value,
          entityType: AppAggregate.name,
          eventType: AppCreatedEvent.name,
        },
        {
          id: this._id.value,
          slug: this._slug.value,
          name: this._name.value,
        },
      ),
    );
  }

  get id(): UuidValueObject {
    return this._id;
  }

  get slug(): AppSlugValueObject {
    return this._slug;
  }

  get name(): AppNameValueObject {
    return this._name;
  }

  toPrimitives(): IAppPrimitives {
    return {
      id: this._id.value,
      slug: this._slug.value,
      name: this._name.value,
      createdAt: this.createdAt.value,
      updatedAt: this.updatedAt.value,
    };
  }
}
