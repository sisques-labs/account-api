import { IUserLookupResult } from '@contexts/auth/application/ports/user-lookup-result.interface';

export const USER_LOOKUP_PORT = Symbol('USER_LOOKUP_PORT');

/**
 * Cross-context port into the `user` context — resolves the local platform
 * user by email (register/login) or id (refresh, which only has the
 * `userId` off the `SessionAggregate`). Implemented by `UserLookupAdapter`,
 * which dispatches via `QueryBus`. Never import `@contexts/user` directly
 * outside `infrastructure/adapters/`.
 */
export interface IUserLookupPort {
  findByEmail(email: string): Promise<IUserLookupResult | null>;
  findById(userId: string): Promise<IUserLookupResult | null>;
}
