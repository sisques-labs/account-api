import { IIdentityProviderPort } from '@contexts/auth/application/ports/identity-provider.port';
import { IRegisterIdentityInput } from '@contexts/auth/application/ports/register-identity-input.interface';
import { IRegisterIdentityResult } from '@contexts/auth/application/ports/register-identity-result.interface';
import { IVerifyCredentialsInput } from '@contexts/auth/application/ports/verify-credentials-input.interface';
import { IVerifyCredentialsResult } from '@contexts/auth/application/ports/verify-credentials-result.interface';
import { EmailAlreadyRegisteredException } from '@contexts/auth/domain/exceptions/email-already-registered.exception';
import { IKeycloakTokenResponse } from '@contexts/auth/infrastructure/adapters/keycloak-token-response.interface';
import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosError, AxiosResponse } from 'axios';
import { firstValueFrom } from 'rxjs';

/**
 * The ONE identity-provider adapter for the MVP (Keycloak, self-hosted).
 * Implements IIdentityProviderPort so a future adapter (e.g. Cognito) can be
 * swapped in without touching the domain/application layers — see the
 * `auth` context README and the architecture doc's "Proveedor de
 * identidad" section. Talks to Keycloak over HTTP via Nest's `HttpService`
 * (Admin REST API for user creation, the token endpoint for credential
 * verification) — Sisques Account is the ONLY caller of Keycloak; apps
 * never talk to it directly.
 */
@Injectable()
export class KeycloakIdentityProviderAdapter implements IIdentityProviderPort {
  private readonly logger = new Logger(KeycloakIdentityProviderAdapter.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async registerIdentity(
    input: IRegisterIdentityInput,
  ): Promise<IRegisterIdentityResult> {
    this.logger.log(`Registering identity in Keycloak: ${input.email}`);

    const token = await this.getServiceAccountToken();
    const nameSource = input.displayName?.trim() || input.email.split('@')[0];
    const [firstName, ...rest] = nameSource.split(/\s+/);
    const lastName = rest.length > 0 ? rest.join(' ') : firstName;

    let response: AxiosResponse<unknown>;
    try {
      response = await firstValueFrom(
        this.httpService.post(
          `${this.baseUrl}/admin/realms/${this.realm}/users`,
          {
            username: input.email,
            email: input.email,
            firstName,
            lastName,
            enabled: true,
            emailVerified: true,
            credentials: [
              { type: 'password', value: input.password, temporary: false },
            ],
          },
          { headers: { Authorization: `Bearer ${token}` } },
        ),
      );
    } catch (error) {
      const status = (error as AxiosError).response?.status;
      if (status === 409) {
        throw new EmailAlreadyRegisteredException(input.email);
      }
      throw new Error(
        `Keycloak user creation failed (${status}): ${JSON.stringify(
          (error as AxiosError).response?.data,
        )}`,
      );
    }

    const location = response.headers['location'] as string | undefined;
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

    let response: AxiosResponse<IKeycloakTokenResponse>;
    try {
      response = await firstValueFrom(
        this.httpService.post<IKeycloakTokenResponse>(
          `${this.baseUrl}/realms/${this.realm}/protocol/openid-connect/token`,
          new URLSearchParams({
            grant_type: 'password',
            client_id: this.clientId,
            client_secret: this.clientSecret,
            username: input.email,
            password: input.password,
          }),
          { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
        ),
      );
    } catch {
      throw new Error('Keycloak rejected the credentials');
    }

    return { externalId: this.decodeSub(response.data.access_token) };
  }

  private async getServiceAccountToken(): Promise<string> {
    let response: AxiosResponse<IKeycloakTokenResponse>;
    try {
      response = await firstValueFrom(
        this.httpService.post<IKeycloakTokenResponse>(
          `${this.baseUrl}/realms/${this.realm}/protocol/openid-connect/token`,
          new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: this.clientId,
            client_secret: this.clientSecret,
          }),
          { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
        ),
      );
    } catch (error) {
      throw new Error(
        `Failed to obtain a Keycloak service-account token (${(error as AxiosError).response?.status})`,
      );
    }

    return response.data.access_token;
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
