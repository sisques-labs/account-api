import { SessionAggregate } from '@contexts/auth/domain/aggregates/session.aggregate';

/** Outcome of a successful chain rotation: the consumed node and its successor. */
export interface IRotateResult {
  revoked: SessionAggregate;
  created: SessionAggregate;
}
