import { UserRegisteredEvent } from '@contexts/identity/domain/events/user-registered/user-registered.event';
import { IUser } from '@contexts/identity/domain/interfaces/user.interface';
import { IUserPrimitives } from '@contexts/identity/domain/primitives/user.primitives';
import { DisplayNameValueObject } from '@contexts/identity/domain/value-objects/display-name/display-name.vo';
import { ExternalIdValueObject } from '@contexts/identity/domain/value-objects/external-id/external-id.vo';
import { RefreshTokenHashValueObject } from '@contexts/identity/domain/value-objects/refresh-token-hash/refresh-token-hash.vo';
import { UserEmailValueObject } from '@contexts/identity/domain/value-objects/user-email/user-email.vo';
import { UserIdValueObject } from '@contexts/identity/domain/value-objects/user-id/user-id.vo';
import {
  BaseAggregate,
  BooleanValueObject,
  DateValueObject,
} from '@sisques-labs/nestjs-kit';

export class UserAggregate extends BaseAggregate {
  private readonly _id: UserIdValueObject;
  private readonly _externalId: ExternalIdValueObject;
  private readonly _email: UserEmailValueObject;
  private readonly _displayName: DisplayNameValueObject;
  private readonly _platformAdmin: BooleanValueObject;
  private _refreshTokenHash: RefreshTokenHashValueObject | null;
  private _refreshTokenExpiresAt: DateValueObject | null;

  constructor(props: IUser) {
    super(props.createdAt, props.updatedAt);
    this._id = props.id;
    this._externalId = props.externalId;
    this._email = props.email;
    this._displayName = props.displayName;
    this._platformAdmin = props.platformAdmin;
    this._refreshTokenHash = props.refreshTokenHash;
    this._refreshTokenExpiresAt = props.refreshTokenExpiresAt;
  }

  public create(): void {
    this.apply(
      new UserRegisteredEvent(
        {
          aggregateRootId: this._id.value,
          aggregateRootType: UserAggregate.name,
          entityId: this._id.value,
          entityType: UserAggregate.name,
          eventType: UserRegisteredEvent.name,
        },
        {
          id: this._id.value,
          externalId: this._externalId.value,
          email: this._email.value,
          displayName: this._displayName.value,
        },
      ),
    );
  }

  /**
   * Issues (or rotates) the single active opaque refresh token for this
   * user. MVP simplification: one active refresh token per user — a new
   * login or refresh overwrites the previous one (see context README).
   */
  public issueRefreshToken(hash: string, expiresAt: Date): void {
    this._refreshTokenHash = new RefreshTokenHashValueObject(hash);
    this._refreshTokenExpiresAt = new DateValueObject(expiresAt);
    this.touch();
  }

  public revokeRefreshToken(): void {
    this._refreshTokenHash = null;
    this._refreshTokenExpiresAt = null;
    this.touch();
  }

  public isRefreshTokenExpired(now: Date = new Date()): boolean {
    if (!this._refreshTokenExpiresAt) return true;
    return this._refreshTokenExpiresAt.value.getTime() <= now.getTime();
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

  get refreshTokenHash(): RefreshTokenHashValueObject | null {
    return this._refreshTokenHash;
  }

  get refreshTokenExpiresAt(): DateValueObject | null {
    return this._refreshTokenExpiresAt;
  }

  toPrimitives(): IUserPrimitives {
    return {
      id: this._id.value,
      externalId: this._externalId.value,
      email: this._email.value,
      displayName: this._displayName.value,
      platformAdmin: this._platformAdmin.value,
      refreshTokenHash: this._refreshTokenHash?.value ?? null,
      refreshTokenExpiresAt: this._refreshTokenExpiresAt?.value ?? null,
      createdAt: this.createdAt.value,
      updatedAt: this.updatedAt.value,
    };
  }
}
