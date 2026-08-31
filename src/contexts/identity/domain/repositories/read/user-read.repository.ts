import { UserViewModel } from '@contexts/identity/domain/view-models/user.view-model';
import { IBaseReadRepository } from '@sisques-labs/nestjs-kit';

export const USER_READ_REPOSITORY = Symbol('USER_READ_REPOSITORY');

export interface IUserReadRepository extends IBaseReadRepository<UserViewModel> {
  findByEmail(email: string): Promise<UserViewModel | null>;
}
