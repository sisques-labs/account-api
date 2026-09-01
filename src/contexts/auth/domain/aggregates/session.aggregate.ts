import { ISession } from '@contexts/auth/domain/interfaces/session.interface';
import { ISessionPrimitives } from '@contexts/auth/domain/primitives/session.primitives';
import { RefreshTokenHashValueObject } from '@contexts/auth/domain/value-objects/refresh-token-hash/refresh-token-hash.vo';
import {
  BaseAggregate,
  DateValueObject,
  UuidValueObject,
} from '@sisques-labs/nestjs-kit';

/**
 * The single active opaque refresh token for a user. MVP simplification:
 * one session per user — a new login or refresh rotates the existing row
 * in place instead of creating a second one (see the `auth` context
 * README). No domain events: nothing consumes a session-issued event.
 */
export class SessionAggregate extends BaseAggregate {
  private readonly _userId: UuidValueObject;
  private _refreshTokenHash: RefreshTokenHashValueObject;
  private _expiresAt: DateValueObject;

  constructor(props: ISession) {
    super(props.id, props.createdAt, props.updatedAt);
    this._userId = props.userId;
    this._refreshTokenHash = props.refreshTokenHash;
    this._expiresAt = props.expiresAt;
  }

  public rotate(hash: string, expiresAt: Date): void {
    this._refreshTokenHash = new RefreshTokenHashValueObject(hash);
    this._expiresAt = new DateValueObject(expiresAt);
    this.touch();
  }

  public isExpired(now: Date = new Date()): boolean {
    return this._expiresAt.value.getTime() <= now.getTime();
  }

  get userId(): UuidValueObject {
    return this._userId;
  }

  get refreshTokenHash(): RefreshTokenHashValueObject {
    return this._refreshTokenHash;
  }

  get expiresAt(): DateValueObject {
    return this._expiresAt;
  }

  toPrimitives(): ISessionPrimitives {
    return {
      id: this._id.value,
      userId: this._userId.value,
      refreshTokenHash: this._refreshTokenHash.value,
      expiresAt: this._expiresAt.value,
      createdAt: this.createdAt.value,
      updatedAt: this.updatedAt.value,
    };
  }
}
