import { AppCreatedEvent } from '@contexts/app/domain/events/app-created/app-created.event';
import { AppDeletedEvent } from '@contexts/app/domain/events/app-deleted/app-deleted.event';
import { AppUpdatedEvent } from '@contexts/app/domain/events/app-updated/app-updated.event';
import { AppNameChangedEvent } from '@contexts/app/domain/events/field-changed/app-name-changed/app-name-changed.event';
import { AppSlugChangedEvent } from '@contexts/app/domain/events/field-changed/app-slug-changed/app-slug-changed.event';
import { IApp } from '@contexts/app/domain/interfaces/app.interface';
import { IAppPrimitives } from '@contexts/app/domain/primitives/app.primitives';
import { AppNameValueObject } from '@contexts/app/domain/value-objects/app-name/app-name.vo';
import { AppSlugValueObject } from '@contexts/app/domain/value-objects/app-slug/app-slug.vo';
import { BaseAggregate, UuidValueObject } from '@sisques-labs/nestjs-kit';

export class AppAggregate extends BaseAggregate {
  private readonly _id: UuidValueObject;
  private _slug: AppSlugValueObject;
  private _name: AppNameValueObject;

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
        this.toPrimitives(),
      ),
    );
  }

  public update(
    props: Omit<Partial<IApp>, 'id' | 'createdAt' | 'updatedAt'>,
  ): void {
    if (props.name !== undefined) {
      this.changeName(props.name);
    }

    if (props.slug !== undefined) {
      this.changeSlug(props.slug);
    }

    this.apply(
      new AppUpdatedEvent(
        {
          aggregateRootId: this._id.value,
          aggregateRootType: AppAggregate.name,
          entityId: this._id.value,
          entityType: AppAggregate.name,
          eventType: AppUpdatedEvent.name,
        },
        this.toPrimitives(),
      ),
    );
  }

  public delete(): void {
    this.apply(
      new AppDeletedEvent(
        {
          aggregateRootId: this._id.value,
          aggregateRootType: AppAggregate.name,
          entityId: this._id.value,
          entityType: AppAggregate.name,
          eventType: AppDeletedEvent.name,
        },
        this.toPrimitives(),
      ),
    );
  }

  private changeName(name: AppNameValueObject): void {
    const oldValue = this._name.value;
    const newValue = name.value;

    if (oldValue === newValue) return;

    this._name = name;

    this.touch();

    this.apply(
      new AppNameChangedEvent(
        {
          aggregateRootId: this._id.value,
          aggregateRootType: AppAggregate.name,
          entityId: this._id.value,
          entityType: AppAggregate.name,
          eventType: AppNameChangedEvent.name,
        },
        {
          id: this._id.value,
          oldValue: oldValue,
          newValue: newValue,
        },
      ),
    );
  }

  private changeSlug(slug: AppSlugValueObject): void {
    const oldValue = this._slug.value;
    const newValue = slug.value;

    if (oldValue === newValue) return;

    this._slug = slug;

    this.touch();

    this.apply(
      new AppSlugChangedEvent(
        {
          aggregateRootId: this._id.value,
          aggregateRootType: AppAggregate.name,
          entityId: this._id.value,
          entityType: AppAggregate.name,
          eventType: AppSlugChangedEvent.name,
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
