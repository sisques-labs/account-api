import { IIdentityProviderPort } from '@contexts/identity/application/ports/identity-provider.port';
import { IRegisterIdentityInput } from '@contexts/identity/application/ports/register-identity-input.interface';
import { IRegisterIdentityResult } from '@contexts/identity/application/ports/register-identity-result.interface';
import { IVerifyCredentialsInput } from '@contexts/identity/application/ports/verify-credentials-input.interface';
import { IVerifyCredentialsResult } from '@contexts/identity/application/ports/verify-credentials-result.interface';
import { UserEmailAlreadyRegisteredException } from '@contexts/identity/domain/exceptions/user-email-already-registered.exception';
import { IKeycloakTokenResponse } from '@contexts/identity/infrastructure/adapters/keycloak-token-response.interface';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * The ONE identity-provider adapter for the MVP (Keycloak, self-hosted).
 * Implements IIdentityProviderPort so a future adapter (e.g. Cognito) can be
 * swapped in without touching the domain/application layers — see the
 * `identity` context README and the architecture doc's "Proveedor de
 * identidad" section. Talks to Keycloak over plain HTTP (Admin REST API for
 * user creation, the token endpoint for credential verification) — Sisques
 * Account is the ONLY caller of Keycloak; apps never talk to it directly.
 */
@Injectable()
export class KeycloakIdentityProviderAdapter implements IIdentityProviderPort {
  private readonly logger = new Logger(KeycloakIdentityProviderAdapter.name);

  constructor(private readonly configService: ConfigService) {}

  async registerIdentity(
    input: IRegisterIdentityInput,
  ): Promise<IRegisterIdentityResult> {
    this.logger.log(`Registering identity in Keycloak: ${input.email}`);

    const token = await this.getServiceAccountToken();
    const [firstName, ...rest] = input.displayName.trim().split(/\s+/);
    const lastName = rest.length > 0 ? rest.join(' ') : firstName;

    const response = await fetch(
      `${this.baseUrl}/admin/realms/${this.realm}/users`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: input.email,
          email: input.email,
          firstName,
          lastName,
          enabled: true,
          emailVerified: true,
          credentials: [
            { type: 'password', value: input.password, temporary: false },
          ],
        }),
      },
    );

    if (response.status === 409) {
      throw new UserEmailAlreadyRegisteredException(input.email);
    }
    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `Keycloak user creation failed (${response.status}): ${body}`,
      );
    }

    const location = response.headers.get('location');
    const externalId = location?.split('/').pop();
    if (!externalId) {
      throw new Error(
        'Keycloak did not return a Location header with the new user id',
      );
    }

    this.logger.log(`Identity registered in Keycloak: ${externalId}`);
    return { externalId };
  }

  async verifyCredentials(
    input: IVerifyCredentialsInput,
  ): Promise<IVerifyCredentialsResult> {
    this.logger.log(`Verifying credentials in Keycloak: ${input.email}`);

    const response = await fetch(
      `${this.baseUrl}/realms/${this.realm}/protocol/openid-connect/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'password',
          client_id: this.clientId,
          client_secret: this.clientSecret,
          username: input.email,
          password: input.password,
        }),
      },
    );

    if (!response.ok) {
      throw new Error('Keycloak rejected the credentials');
    }

    const body = (await response.json()) as IKeycloakTokenResponse;
    return { externalId: this.decodeSub(body.access_token) };
  }

  private async getServiceAccountToken(): Promise<string> {
    const response = await fetch(
      `${this.baseUrl}/realms/${this.realm}/protocol/openid-connect/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: this.clientId,
          client_secret: this.clientSecret,
        }),
      },
    );

    if (!response.ok) {
      throw new Error(
        `Failed to obtain a Keycloak service-account token (${response.status})`,
      );
    }

    const body = (await response.json()) as IKeycloakTokenResponse;
    return body.access_token;
  }

  private decodeSub(jwt: string): string {
    const payloadSegment = jwt.split('.')[1];
    const payload = JSON.parse(
      Buffer.from(payloadSegment, 'base64url').toString('utf8'),
    ) as { sub: string };
    return payload.sub;
  }

  private get baseUrl(): string {
    return this.configService.getOrThrow<string>('auth.keycloak.baseUrl');
  }

  private get realm(): string {
    return this.configService.getOrThrow<string>('auth.keycloak.realm');
  }

  private get clientId(): string {
    return this.configService.getOrThrow<string>('auth.keycloak.clientId');
  }

  private get clientSecret(): string {
    return this.configService.getOrThrow<string>('auth.keycloak.clientSecret');
  }
}
