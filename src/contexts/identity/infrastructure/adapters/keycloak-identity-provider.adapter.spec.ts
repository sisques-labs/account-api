import { UserEmailAlreadyRegisteredException } from '@contexts/identity/domain/exceptions/user-email-already-registered.exception';
import { ConfigService } from '@nestjs/config';

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

describe('KeycloakIdentityProviderAdapter', () => {
  let adapter: KeycloakIdentityProviderAdapter;
  let configService: jest.Mocked<ConfigService>;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    configService = {
      getOrThrow: jest.fn((key: string) => CONFIG[key]),
    } as unknown as jest.Mocked<ConfigService>;
    adapter = new KeycloakIdentityProviderAdapter(configService);
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  describe('registerIdentity()', () => {
    it('should create the user via the Admin API and return the externalId from the Location header', async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ access_token: 'service-account-token' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 201,
          headers: {
            get: (name: string) =>
              name === 'location'
                ? 'http://localhost:8081/admin/realms/sisques-account/users/kc-sub-123'
                : null,
          },
        });

      const result = await adapter.registerIdentity({
        email: 'new@example.com',
        password: 'S3cret!123',
        displayName: 'New User',
      });

      expect(result).toEqual({ externalId: 'kc-sub-123' });
      const createUserCall = fetchMock.mock.calls[1];
      expect(createUserCall[0]).toBe(
        'http://localhost:8081/admin/realms/sisques-account/users',
      );
      const body = JSON.parse(createUserCall[1].body as string);
      expect(body).toMatchObject({
        username: 'new@example.com',
        email: 'new@example.com',
        firstName: 'New',
        lastName: 'User',
        enabled: true,
      });
    });

    it('should throw UserEmailAlreadyRegisteredException on a 409 from Keycloak', async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ access_token: 'service-account-token' }),
        })
        .mockResolvedValueOnce({ ok: false, status: 409 });

      await expect(
        adapter.registerIdentity({
          email: 'taken@example.com',
          password: 'S3cret!123',
          displayName: 'Taken User',
        }),
      ).rejects.toThrow(UserEmailAlreadyRegisteredException);
    });

    it('should throw when Keycloak returns a non-409 error', async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ access_token: 'service-account-token' }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          text: async () => 'internal error',
        });

      await expect(
        adapter.registerIdentity({
          email: 'x@example.com',
          password: 'S3cret!123',
          displayName: 'X',
        }),
      ).rejects.toThrow('Keycloak user creation failed');
    });

    it('should throw when Keycloak omits the Location header', async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ access_token: 'service-account-token' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 201,
          headers: { get: () => null },
        });

      await expect(
        adapter.registerIdentity({
          email: 'no-location@example.com',
          password: 'S3cret!123',
          displayName: 'No Location',
        }),
      ).rejects.toThrow('did not return a Location header');
    });

    it('should throw when fetching the service-account token fails', async () => {
      fetchMock.mockResolvedValueOnce({ ok: false, status: 500 });

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
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: FAKE_KEYCLOAK_JWT }),
      });

      const result = await adapter.verifyCredentials({
        email: 'user@example.com',
        password: 'correct-password',
      });

      expect(result).toEqual({ externalId: 'kc-sub-123' });
    });

    it('should throw when Keycloak rejects the credentials', async () => {
      fetchMock.mockResolvedValueOnce({ ok: false, status: 401 });

      await expect(
        adapter.verifyCredentials({
          email: 'user@example.com',
          password: 'wrong-password',
        }),
      ).rejects.toThrow('Keycloak rejected the credentials');
    });
  });
});
