import { AppAggregate } from '@contexts/app/domain/aggregates/app/app.aggregate';
import { IBaseWriteRepository } from '@sisques-labs/nestjs-kit';

export const APP_WRITE_REPOSITORY = Symbol('APP_WRITE_REPOSITORY');

export interface IAppWriteRepository extends IBaseWriteRepository<AppAggregate> {
  findBySlug(slug: string): Promise<AppAggregate | null>;
}
