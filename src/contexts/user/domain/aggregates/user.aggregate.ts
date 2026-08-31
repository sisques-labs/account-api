import { UserRegisteredEvent } from '@contexts/user/domain/events/user-registered/user-registered.event';
import { IUser } from '@contexts/user/domain/interfaces/user.interface';
import { IUserPrimitives } from '@contexts/user/domain/primitives/user.primitives';
import { DisplayNameValueObject } from '@contexts/user/domain/value-objects/display-name/display-name.vo';
import { ExternalIdValueObject } from '@contexts/user/domain/value-objects/external-id/external-id.vo';
import { UserEmailValueObject } from '@contexts/user/domain/value-objects/user-email/user-email.vo';
import { UserIdValueObject } from '@contexts/user/domain/value-objects/user-id/user-id.vo';
import { BaseAggregate, BooleanValueObject } from '@sisques-labs/nestjs-kit';

export class UserAggregate extends BaseAggregate {
  private readonly _externalId: ExternalIdValueObject;
  private readonly _email: UserEmailValueObject;
  private readonly _displayName: DisplayNameValueObject;
  private readonly _platformAdmin: BooleanValueObject;

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
        {
          id: this._id.value,
          externalId: this._externalId.value,
          email: this._email.value,
          displayName: this._displayName.value,
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

  get displayName(): DisplayNameValueObject {
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
      displayName: this._displayName.value,
      platformAdmin: this._platformAdmin.value,
      createdAt: this.createdAt.value,
      updatedAt: this.updatedAt.value,
    };
  }
}
