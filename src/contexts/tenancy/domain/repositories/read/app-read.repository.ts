import { AppViewModel } from '@contexts/tenancy/domain/view-models/app.view-model';
import { IBaseReadRepository } from '@sisques-labs/nestjs-kit';

export const APP_READ_REPOSITORY = Symbol('APP_READ_REPOSITORY');

export type IAppReadRepository = IBaseReadRepository<AppViewModel>;
