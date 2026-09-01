import { SessionAggregate } from '@contexts/auth/domain/aggregates/session.aggregate';
import { IBaseWriteRepository } from '@sisques-labs/nestjs-kit';

export const SESSION_WRITE_REPOSITORY = Symbol('SESSION_WRITE_REPOSITORY');

export interface ISessionWriteRepository extends IBaseWriteRepository<SessionAggregate> {
  findByUserId(userId: string): Promise<SessionAggregate | null>;
  findByRefreshTokenHash(hash: string): Promise<SessionAggregate | null>;
}
