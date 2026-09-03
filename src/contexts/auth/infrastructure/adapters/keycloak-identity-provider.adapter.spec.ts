import { EmailAlreadyRegisteredException } from '@contexts/auth/domain/exceptions/email-already-registered.exception';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { AxiosError, AxiosResponse } from 'axios';
import { of, throwError } from 'rxjs';

import { KeycloakIdentityProviderAdapter } from './keycloak-identity-provider.adapter';

const CONFIG: Record<string, string> = {
  'auth.keycloak.baseUrl': 'http://localhost:8081',
  'auth.keycloak.realm': 'sisques-account',
  'auth.keycloak.clientId': 'account-api',
  'auth.keycloak.clientSecret': 'local-dev-secret-change-me',
};

// A syntactically valid JWT whose payload is {"sub":"kc-sub-123"} — the
// adapter decodes it locally without verifying the signature (it only ever
// trusts it because it just received it directly from Keycloak's own token
// endpoint over HTTPS/localhost, in the same request/response cycle).
const FAKE_KEYCLOAK_JWT = 'eyJhbGciOiJub25lIn0.eyJzdWIiOiJrYy1zdWItMTIzIn0.sig';

function axiosResponse<T>(
  data: T,
  headers: Record<string, string> = {},
): AxiosResponse<T> {
  return {
    data,
    status: 200,
    statusText: 'OK',
    headers,
    config: {} as AxiosResponse['config'],
  } as AxiosResponse<T>;
}

function axiosError(status: number): AxiosError {
  return {
    isAxiosError: true,
    name: 'AxiosError',
    message: 'Request failed',
    response: {
      status,
      data: undefined,
      statusText: '',
      headers: {},
      config: {} as AxiosResponse['config'],
    },
    toJSON: () => ({}),
  } as unknown as AxiosError;
}

describe('KeycloakIdentityProviderAdapter', () => {
  let adapter: KeycloakIdentityProviderAdapter;
  let configService: jest.Mocked<ConfigService>;
  let httpService: jest.Mocked<HttpService>;

  beforeEach(() => {
    configService = {
      getOrThrow: jest.fn((key: string) => CONFIG[key]),
    } as unknown as jest.Mocked<ConfigService>;
    httpService = { post: jest.fn() } as unknown as jest.Mocked<HttpService>;
    adapter = new KeycloakIdentityProviderAdapter(httpService, configService);
  });

  describe('registerIdentity()', () => {
    it('should create the user via the Admin API and return the externalId from the Location header', async () => {
      httpService.post
        .mockReturnValueOnce(
          of(axiosResponse({ access_token: 'service-account-token' })),
        )
        .mockReturnValueOnce(
          of(
            axiosResponse(undefined, {
              location:
                'http://localhost:8081/admin/realms/sisques-account/users/kc-sub-123',
            }),
          ),
        );

      const result = await adapter.registerIdentity({
        email: 'new@example.com',
        password: 'S3cret!123',
        displayName: 'New User',
      });

      expect(result).toEqual({ externalId: 'kc-sub-123' });
      const createUserCall = httpService.post.mock.calls[1];
      expect(createUserCall[0]).toBe(
        'http://localhost:8081/admin/realms/sisques-account/users',
      );
      expect(createUserCall[1]).toMatchObject({
        username: 'new@example.com',
        email: 'new@example.com',
        firstName: 'New',
        lastName: 'User',
        enabled: true,
      });
    });

    it('should throw EmailAlreadyRegisteredException on a 409 from Keycloak', async () => {
      httpService.post
        .mockReturnValueOnce(
          of(axiosResponse({ access_token: 'service-account-token' })),
        )
        .mockReturnValueOnce(throwError(() => axiosError(409)));

      await expect(
        adapter.registerIdentity({
          email: 'taken@example.com',
          password: 'S3cret!123',
          displayName: 'Taken User',
        }),
      ).rejects.toThrow(EmailAlreadyRegisteredException);
    });

    it('should throw when Keycloak returns a non-409 error', async () => {
      httpService.post
        .mockReturnValueOnce(
          of(axiosResponse({ access_token: 'service-account-token' })),
        )
        .mockReturnValueOnce(throwError(() => axiosError(500)));

      await expect(
        adapter.registerIdentity({
          email: 'x@example.com',
          password: 'S3cret!123',
          displayName: 'X',
        }),
      ).rejects.toThrow('Keycloak user creation failed');
    });

    it('should throw when Keycloak omits the Location header', async () => {
      httpService.post
        .mockReturnValueOnce(
          of(axiosResponse({ access_token: 'service-account-token' })),
        )
        .mockReturnValueOnce(of(axiosResponse(undefined, {})));

      await expect(
        adapter.registerIdentity({
          email: 'no-location@example.com',
          password: 'S3cret!123',
          displayName: 'No Location',
        }),
      ).rejects.toThrow('did not return a Location header');
    });

    it('should throw when fetching the service-account token fails', async () => {
      httpService.post.mockReturnValueOnce(throwError(() => axiosError(500)));

      await expect(
        adapter.registerIdentity({
          email: 'x2@example.com',
          password: 'S3cret!123',
          displayName: 'X2',
        }),
      ).rejects.toThrow('Failed to obtain a Keycloak service-account token');
    });
  });

  describe('verifyCredentials()', () => {
    it('should return the externalId decoded from the access token', async () => {
      httpService.post.mockReturnValueOnce(
        of(axiosResponse({ access_token: FAKE_KEYCLOAK_JWT })),
      );

      const result = await adapter.verifyCredentials({
        email: 'user@example.com',
        password: 'correct-password',
      });

      expect(result).toEqual({ externalId: 'kc-sub-123' });
    });

    it('should throw when Keycloak rejects the credentials', async () => {
      httpService.post.mockReturnValueOnce(throwError(() => axiosError(401)));

      await expect(
        adapter.verifyCredentials({
          email: 'user@example.com',
          password: 'wrong-password',
        }),
      ).rejects.toThrow('Keycloak rejected the credentials');
    });
  });
});
