import { IRegisterIdentityInput } from '@contexts/identity/application/ports/register-identity-input.interface';
import { IRegisterIdentityResult } from '@contexts/identity/application/ports/register-identity-result.interface';
import { IVerifyCredentialsInput } from '@contexts/identity/application/ports/verify-credentials-input.interface';
import { IVerifyCredentialsResult } from '@contexts/identity/application/ports/verify-credentials-result.interface';

export const IDENTITY_PROVIDER_PORT = Symbol('IDENTITY_PROVIDER_PORT');

/**
 * Port to the external identity provider (user store: passwords, hashing,
 * MFA, email verification, brute-force protection). Keycloak is the only
 * implementation today (`KeycloakIdentityProviderAdapter`) — the port is
 * shaped so a second provider (e.g. Cognito) could implement it later
 * without changing the domain/application layers. See the context README.
 */
export interface IIdentityProviderPort {
  registerIdentity(
    input: IRegisterIdentityInput,
  ): Promise<IRegisterIdentityResult>;

  verifyCredentials(
    input: IVerifyCredentialsInput,
  ): Promise<IVerifyCredentialsResult>;
}
