import { IUserProvisioningInput } from '@contexts/auth/application/ports/user-provisioning-input.interface';
import { IUserProvisioningResult } from '@contexts/auth/application/ports/user-provisioning-result.interface';

export const USER_PROVISIONING_PORT = Symbol('USER_PROVISIONING_PORT');

/**
 * Cross-context port into the `user` context — creates the local platform
 * `user` row once `auth` has already registered the identity with the
 * external provider (Keycloak). Implemented by `UserProvisioningAdapter`,
 * which dispatches `CreateUserCommand` via `CommandBus`. Never import
 * `@contexts/user` directly outside `infrastructure/adapters/`.
 */
export interface IUserProvisioningPort {
  createUser(input: IUserProvisioningInput): Promise<IUserProvisioningResult>;
}
