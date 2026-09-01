import { UserAggregate } from '@contexts/user/domain/aggregates/user.aggregate';
import { IBaseWriteRepository } from '@sisques-labs/nestjs-kit';

export const USER_WRITE_REPOSITORY = Symbol('USER_WRITE_REPOSITORY');

export interface IUserWriteRepository extends IBaseWriteRepository<UserAggregate> {
  findByEmail(email: string): Promise<UserAggregate | null>;
  findByExternalId(externalId: string): Promise<UserAggregate | null>;
}
