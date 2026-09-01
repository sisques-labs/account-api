import { UserDeletedEvent } from '@contexts/user/domain/events/user-deleted/user-deleted.event';
import { UserRegisteredEvent } from '@contexts/user/domain/events/user-registered/user-registered.event';
import { UserUpdatedEvent } from '@contexts/user/domain/events/user-updated/user-updated.event';
import { UserDisplayNameChangedEvent } from '@contexts/user/domain/events/field-changed/user-display-name-changed/user-display-name-changed.event';
import { UserEmailChangedEvent } from '@contexts/user/domain/events/field-changed/user-email-changed/user-email-changed.event';
import { UserPlatformAdminChangedEvent } from '@contexts/user/domain/events/field-changed/user-platform-admin-changed/user-platform-admin-changed.event';
import { IUser } from '@contexts/user/domain/interfaces/user.interface';
import { IUserPrimitives } from '@contexts/user/domain/primitives/user.primitives';
import { DisplayNameValueObject } from '@contexts/user/domain/value-objects/display-name/display-name.vo';
import { ExternalIdValueObject } from '@contexts/user/domain/value-objects/external-id/external-id.vo';
import { UserEmailValueObject } from '@contexts/user/domain/value-objects/user-email/user-email.vo';
import { UserIdValueObject } from '@contexts/user/domain/value-objects/user-id/user-id.vo';
import { BaseAggregate, BooleanValueObject } from '@sisques-labs/nestjs-kit';

export class UserAggregate extends BaseAggregate {
  private readonly _externalId: ExternalIdValueObject;
  private _email: UserEmailValueObject;
  private _displayName?: DisplayNameValueObject;
  private _platformAdmin: BooleanValueObject;

  constructor(props: IUser) {
    super(props.id, props.createdAt, props.updatedAt);
    this._externalId = props.externalId;
    this._email = props.email;
    this._displayName = props.displayName;
    this._platformAdmin = props.platformAdmin;
  }

  public create(): void {
    this.apply(
      new UserRegisteredEvent(
        this.generateEventMetadata({ name: UserRegisteredEvent.name }),
        this.toPrimitives(),
      ),
    );
  }

  public update(
    props: Omit<
      Partial<IUser>,
      'id' | 'externalId' | 'createdAt' | 'updatedAt'
    >,
  ): void {
    if (props.email !== undefined) {
      this.changeEmail(props.email);
    }

    if (props.displayName !== undefined) {
      this.changeDisplayName(props.displayName);
    }

    if (props.platformAdmin !== undefined) {
      this.changePlatformAdmin(props.platformAdmin);
    }

    this.apply(
      new UserUpdatedEvent(
        this.generateEventMetadata({ name: UserUpdatedEvent.name }),
        this.toPrimitives(),
      ),
    );
  }

  public delete(): void {
    this.apply(
      new UserDeletedEvent(
        this.generateEventMetadata({ name: UserDeletedEvent.name }),
        this.toPrimitives(),
      ),
    );
  }

  private changeEmail(email: UserEmailValueObject): void {
    const oldValue = this._email.value;
    const newValue = email.value;

    if (oldValue === newValue) return;

    this._email = email;

    this.touch();

    this.apply(
      new UserEmailChangedEvent(
        this.generateEventMetadata({ name: UserEmailChangedEvent.name }),
        {
          id: this._id.value,
          oldValue: oldValue,
          newValue: newValue,
        },
      ),
    );
  }

  private changeDisplayName(
    displayName: DisplayNameValueObject | undefined,
  ): void {
    const oldValue = this._displayName?.value ?? null;
    const newValue = displayName?.value ?? null;

    if (oldValue === newValue) return;

    this._displayName = displayName;

    this.touch();

    this.apply(
      new UserDisplayNameChangedEvent(
        this.generateEventMetadata({ name: UserDisplayNameChangedEvent.name }),
        {
          id: this._id.value,
          oldValue: oldValue,
          newValue: newValue,
        },
      ),
    );
  }

  private changePlatformAdmin(platformAdmin: BooleanValueObject): void {
    const oldValue = this._platformAdmin.value;
    const newValue = platformAdmin.value;

    if (oldValue === newValue) return;

    this._platformAdmin = platformAdmin;

    this.touch();

    this.apply(
      new UserPlatformAdminChangedEvent(
        this.generateEventMetadata({
          name: UserPlatformAdminChangedEvent.name,
        }),
        {
          id: this._id.value,
          oldValue: oldValue,
          newValue: newValue,
        },
      ),
    );
  }

  get id(): UserIdValueObject {
    return this._id;
  }

  get externalId(): ExternalIdValueObject {
    return this._externalId;
  }

  get email(): UserEmailValueObject {
    return this._email;
  }

  get displayName(): DisplayNameValueObject | undefined {
    return this._displayName;
  }

  get platformAdmin(): BooleanValueObject {
    return this._platformAdmin;
  }

  toPrimitives(): IUserPrimitives {
    return {
      id: this._id.value,
      externalId: this._externalId.value,
      email: this._email.value,
      displayName: this._displayName?.value ?? null,
      platformAdmin: this._platformAdmin.value,
      createdAt: this.createdAt.value,
      updatedAt: this.updatedAt.value,
    };
  }
}
