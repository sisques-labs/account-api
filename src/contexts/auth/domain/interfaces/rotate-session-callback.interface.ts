import { SessionAggregate } from '@contexts/auth/domain/aggregates/session.aggregate';
import { IRotateResult } from '@contexts/auth/domain/interfaces/rotate-result.interface';

/**
 * Invoked by `ISessionWriteRepository.rotate()` inside the locked
 * transaction. `current` is the row-locked session identified by the
 * presented refresh token. `findLockedById` locks (`SELECT ... FOR UPDATE`)
 * another session row within the same transaction — used by reuse
 * detection to walk beyond the immediately presented token if needed.
 */
export type RotateSessionCallback = (
  current: SessionAggregate,
  findLockedById: (id: string) => Promise<SessionAggregate | null>,
) => Promise<IRotateResult>;
