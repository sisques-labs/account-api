import { ISession } from '@contexts/auth/domain/interfaces/session.interface';
import { ISessionPrimitives } from '@contexts/auth/domain/primitives/session.primitives';
import { RefreshTokenHashValueObject } from '@contexts/auth/domain/value-objects/refresh-token-hash/refresh-token-hash.vo';
import {
  BaseAggregate,
  DateValueObject,
  UuidValueObject,
} from '@sisques-labs/nestjs-kit';

/**
 * One node in a user's refresh-token chain. Each rotation revokes the
 * presented session and links it to its successor via
 * `replacedBySessionId` (linked-list shape, no `family_id` — see
 * `design.md`'s Session Chain Shape decision). Reuse of an already-revoked
 * token invalidates every session for the user (`revokeAllByUserId`,
 * over-revocation of a user's other chains accepted as an MVP tradeoff).
 * No domain events: nothing consumes a session-issued event.
 */
export class SessionAggregate extends BaseAggregate {
  private readonly _userId: UuidValueObject;
  private _refreshTokenHash: RefreshTokenHashValueObject;
  private _expiresAt: DateValueObject;
  private _revokedAt: DateValueObject | null;
  private _replacedBySessionId: UuidValueObject | null;

  constructor(props: ISession) {
    super(props.id, props.createdAt, props.updatedAt);
    this._userId = props.userId;
    this._refreshTokenHash = props.refreshTokenHash;
    this._expiresAt = props.expiresAt;
    this._revokedAt = props.revokedAt;
    this._replacedBySessionId = props.replacedBySessionId;
  }

  public isExpired(now: Date = new Date()): boolean {
    return this._expiresAt.value.getTime() <= now.getTime();
  }

  /** Marks this session consumed and links it to its successor in the chain. */
  public revoke(replacedBySessionId: UuidValueObject): void {
    this._revokedAt = new DateValueObject(new Date());
    this._replacedBySessionId = replacedBySessionId;
    this.touch();
  }

  public isRevoked(): boolean {
    return this._revokedAt !== null;
  }

  /**
   * Called when an already-revoked token is redeemed again (replay). The
   * session stays revoked; the caller is responsible for invalidating the
   * rest of the chain via `revokeAllByUserId`.
   */
  public markReuseDetected(): void {
    this.touch();
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

  get revokedAt(): DateValueObject | null {
    return this._revokedAt;
  }

  get replacedBySessionId(): UuidValueObject | null {
    return this._replacedBySessionId;
  }

  toPrimitives(): ISessionPrimitives {
    return {
      id: this._id.value,
      userId: this._userId.value,
      refreshTokenHash: this._refreshTokenHash.value,
      expiresAt: this._expiresAt.value,
      revokedAt: this._revokedAt?.value ?? null,
      replacedBySessionId: this._replacedBySessionId?.value ?? null,
      createdAt: this.createdAt.value,
      updatedAt: this.updatedAt.value,
    };
  }
}
