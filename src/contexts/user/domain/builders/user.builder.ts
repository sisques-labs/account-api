import { UserAggregate } from '@contexts/user/domain/aggregates/user.aggregate';
import { DisplayNameValueObject } from '@contexts/user/domain/value-objects/display-name/display-name.vo';
import { ExternalIdValueObject } from '@contexts/user/domain/value-objects/external-id/external-id.vo';
import { UserEmailValueObject } from '@contexts/user/domain/value-objects/user-email/user-email.vo';
import { UserIdValueObject } from '@contexts/user/domain/value-objects/user-id/user-id.vo';
import { UserViewModel } from '@contexts/user/domain/view-models/user.view-model';
import { Injectable } from '@nestjs/common';
import {
  BaseBuilder,
  BooleanValueObject,
  DateValueObject,
  FieldIsRequiredException,
} from '@sisques-labs/nestjs-kit';

@Injectable()
export class UserBuilder extends BaseBuilder<UserAggregate, UserViewModel> {
  private _externalId!: string;
  private _email!: string;
  private _displayName!: string;
  private _platformAdmin = false;

  withExternalId(externalId: string): this {
    this._externalId = externalId;
    return this;
  }

  withEmail(email: string): this {
    this._email = email;
    return this;
  }

  withDisplayName(displayName: string): this {
    this._displayName = displayName;
    return this;
  }

  withPlatformAdmin(platformAdmin: boolean): this {
    this._platformAdmin = platformAdmin;
    return this;
  }

  public override validate(): void {
    super.validate();
    if (!this._externalId) throw new FieldIsRequiredException('externalId');
    if (!this._email) throw new FieldIsRequiredException('email');
    if (!this._displayName) throw new FieldIsRequiredException('displayName');
  }

  public override build(): UserAggregate {
    this.validate();

    return new UserAggregate({
      id: new UserIdValueObject(this._id),
      externalId: new ExternalIdValueObject(this._externalId),
      email: new UserEmailValueObject(this._email),
      displayName: new DisplayNameValueObject(this._displayName),
      platformAdmin: new BooleanValueObject(this._platformAdmin),
      createdAt: new DateValueObject(this._createdAt ?? new Date()),
      updatedAt: new DateValueObject(this._updatedAt ?? new Date()),
    });
  }

  public override buildViewModel(): UserViewModel {
    super.validate();
    if (!this._externalId) throw new FieldIsRequiredException('externalId');
    if (!this._email) throw new FieldIsRequiredException('email');
    if (!this._displayName) throw new FieldIsRequiredException('displayName');

    return new UserViewModel({
      id: this._id,
      externalId: this._externalId,
      email: this._email,
      displayName: this._displayName,
      platformAdmin: this._platformAdmin,
      createdAt: this._createdAt ?? new Date(),
      updatedAt: this._updatedAt ?? new Date(),
    });
  }
}
