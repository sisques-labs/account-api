import { SessionAggregate } from '@contexts/auth/domain/aggregates/session.aggregate';
import { RefreshTokenHashValueObject } from '@contexts/auth/domain/value-objects/refresh-token-hash/refresh-token-hash.vo';
import { SessionViewModel } from '@contexts/auth/domain/view-models/session.view-model';
import { Injectable } from '@nestjs/common';
import {
  BaseBuilder,
  DateValueObject,
  FieldIsRequiredException,
  UuidValueObject,
} from '@sisques-labs/nestjs-kit';

@Injectable()
export class SessionBuilder extends BaseBuilder<
  SessionAggregate,
  SessionViewModel
> {
  private _userId!: string;
  private _refreshTokenHash!: string;
  private _expiresAt!: Date;
  private _revokedAt: Date | null = null;
  private _replacedBySessionId: string | null = null;

  withUserId(userId: string): this {
    this._userId = userId;
    return this;
  }

  withRefreshTokenHash(refreshTokenHash: string): this {
    this._refreshTokenHash = refreshTokenHash;
    return this;
  }

  withExpiresAt(expiresAt: Date): this {
    this._expiresAt = expiresAt;
    return this;
  }

  withRevokedAt(revokedAt: Date | null): this {
    this._revokedAt = revokedAt;
    return this;
  }

  withReplacedBySessionId(replacedBySessionId: string | null): this {
    this._replacedBySessionId = replacedBySessionId;
    return this;
  }

  public override validate(): void {
    super.validate();
    if (!this._userId) throw new FieldIsRequiredException('userId');
    if (!this._refreshTokenHash)
      throw new FieldIsRequiredException('refreshTokenHash');
    if (!this._expiresAt) throw new FieldIsRequiredException('expiresAt');
  }

  public override build(): SessionAggregate {
    this.validate();

    return new SessionAggregate({
      id: new UuidValueObject(this._id),
      userId: new UuidValueObject(this._userId),
      refreshTokenHash: new RefreshTokenHashValueObject(this._refreshTokenHash),
      expiresAt: new DateValueObject(this._expiresAt),
      revokedAt: this._revokedAt ? new DateValueObject(this._revokedAt) : null,
      replacedBySessionId: this._replacedBySessionId
        ? new UuidValueObject(this._replacedBySessionId)
        : null,
      createdAt: new DateValueObject(this._createdAt ?? new Date()),
      updatedAt: new DateValueObject(this._updatedAt ?? new Date()),
    });
  }

  // No session-read.repository/query exists yet — nothing consumes this.
  // Implemented ahead of a read side landing (unlike TenantBuilder's
  // documented never-implement stance) so the eventual query only needs
  // to wire the repository, not touch the builder.
  public override buildViewModel(): SessionViewModel {
    this.validate();

    return new SessionViewModel({
      id: this._id,
      userId: this._userId,
      expiresAt: this._expiresAt,
      revokedAt: this._revokedAt,
      replacedBySessionId: this._replacedBySessionId,
      createdAt: this._createdAt ?? new Date(),
      updatedAt: this._updatedAt ?? new Date(),
    });
  }
}
