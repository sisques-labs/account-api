import { IUserLookupResult } from '@contexts/tenancy/application/ports/user-lookup-result.interface';

export const USER_LOOKUP_PORT = Symbol('USER_LOOKUP_PORT');

/**
 * Cross-context port into the `user` context — resolves an email to a
 * platform userId when adding an existing user as a tenant member.
 * Implemented by `UserLookupAdapter`, which dispatches via QueryBus. Never
 * import `@contexts/user` directly outside `infrastructure/adapters/`.
 */
export interface IUserLookupPort {
  findUserIdByEmail(email: string): Promise<IUserLookupResult | null>;
}
