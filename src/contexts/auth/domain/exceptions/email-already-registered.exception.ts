import { BaseException } from '@sisques-labs/nestjs-kit';

/**
 * Auth's own version of "email taken" — distinct from `user`'s
 * `UserEmailAlreadyRegisteredException` (same naming precedent as
 * `tenancy`'s `MemberUserNotFoundException` vs. `user`'s
 * `UserNotFoundException`). Thrown by `RegisterUserCommandHandler`'s
 * pre-check (before calling Keycloak) and reused by
 * `KeycloakIdentityProviderAdapter` when Keycloak itself reports a 409.
 */
export class EmailAlreadyRegisteredException extends BaseException {
  constructor(email: string) {
    super(`A user with email "${email}" is already registered`);
  }
}
