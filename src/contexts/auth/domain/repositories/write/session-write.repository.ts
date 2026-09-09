import { SessionAggregate } from '@contexts/auth/domain/aggregates/session.aggregate';
import { IRotateResult } from '@contexts/auth/domain/interfaces/rotate-result.interface';
import { RotateSessionCallback } from '@contexts/auth/domain/interfaces/rotate-session-callback.interface';
import { IBaseWriteRepository } from '@sisques-labs/nestjs-kit';

export const SESSION_WRITE_REPOSITORY = Symbol('SESSION_WRITE_REPOSITORY');

export interface ISessionWriteRepository extends IBaseWriteRepository<SessionAggregate> {
  findByUserId(userId: string): Promise<SessionAggregate | null>;
  findByRefreshTokenHash(hash: string): Promise<SessionAggregate | null>;
  /**
   * Locks (`SELECT ... FOR UPDATE`) the session row matching
   * `refreshTokenHash` and runs `callback` in the same transaction. Returns
   * `null` when no row matches the hash. Not yet called from any handler in
   * WU-3a — WU-3b wires it into `RefreshSessionCommandHandler`.
   */
  rotate(
    refreshTokenHash: string,
    callback: RotateSessionCallback,
  ): Promise<IRotateResult | null>;
  /** Revokes every non-revoked session for `userId`. Used on reuse detection. */
  revokeAllByUserId(userId: string): Promise<void>;
}
