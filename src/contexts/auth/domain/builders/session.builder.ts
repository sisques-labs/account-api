import { SessionAggregate } from '@contexts/auth/domain/aggregates/session.aggregate';
import { RefreshTokenHashValueObject } from '@contexts/auth/domain/value-objects/refresh-token-hash/refresh-token-hash.vo';
import { Injectable } from '@nestjs/common';
import {
  BaseBuilder,
  DateValueObject,
  FieldIsRequiredException,
  UuidValueObject,
} from '@sisques-labs/nestjs-kit';

@Injectable()
export class SessionBuilder extends BaseBuilder<SessionAggregate, never> {
  private _userId!: string;
  private _refreshTokenHash!: string;
  private _expiresAt!: Date;

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
      createdAt: new DateValueObject(this._createdAt ?? new Date()),
      updatedAt: new DateValueObject(this._updatedAt ?? new Date()),
    });
  }

  // No read-side/GraphQL exposure for sessions — never called.
  public override buildViewModel(): never {
    throw new Error('SessionBuilder has no view model.');
  }
}
