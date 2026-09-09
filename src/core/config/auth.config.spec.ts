import { createPublicKey } from 'crypto';

import { authConfig } from './auth.config';

function toBase64Pem(pem: string): string {
  return Buffer.from(pem, 'utf8').toString('base64');
}

describe('authConfig', () => {
  const ORIGINAL_ENV = { ...process.env };

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it('should fall back to defaults when no env vars are set', () => {
    delete process.env.JWT_PRIVATE_KEY;
    delete process.env.JWT_EXPIRES_IN;
    delete process.env.REFRESH_TOKEN_TTL_DAYS;
    delete process.env.KEYCLOAK_BASE_URL;
    delete process.env.KEYCLOAK_REALM;
    delete process.env.KEYCLOAK_CLIENT_ID;
    delete process.env.KEYCLOAK_CLIENT_SECRET;

    const config = authConfig();

    expect(config.jwtExpiresIn).toBe('15m');
    expect(config.refreshTokenTtlDays).toBe(30);
    expect(config.keycloak.realm).toBe('sisques-account');
    expect(config.keycloak.clientId).toBe('account-api');
  });

  it('should read values from the environment when set', () => {
    process.env.JWT_EXPIRES_IN = '10m';
    process.env.REFRESH_TOKEN_TTL_DAYS = '7';
    process.env.KEYCLOAK_BASE_URL = 'http://keycloak:8080';
    process.env.KEYCLOAK_REALM = 'custom-realm';
    process.env.KEYCLOAK_CLIENT_ID = 'custom-client';
    process.env.KEYCLOAK_CLIENT_SECRET = 'super-secret';

    const config = authConfig();

    expect(config.jwtExpiresIn).toBe('10m');
    expect(config.refreshTokenTtlDays).toBe(7);
    expect(config.keycloak).toEqual({
      baseUrl: 'http://keycloak:8080',
      realm: 'custom-realm',
      clientId: 'custom-client',
      clientSecret: 'super-secret',
    });
  });

  it('generates an ephemeral RS256 keypair when JWT_PRIVATE_KEY is unset', () => {
    delete process.env.JWT_PRIVATE_KEY;

    const config = authConfig();

    expect(config.jwtPrivateKey).toContain('PRIVATE KEY');
    expect(config.jwtPublicKey).toContain('PUBLIC KEY');
    expect(config.jwtKeyId.length).toBeGreaterThan(0);
  });

  it('decodes JWT_PRIVATE_KEY and derives the matching public key/kid when set', () => {
    const ephemeral = authConfig();
    process.env.JWT_PRIVATE_KEY = toBase64Pem(ephemeral.jwtPrivateKey);

    const config = authConfig();

    expect(config.jwtPrivateKey).toBe(ephemeral.jwtPrivateKey);
    expect(config.jwtPublicKey).toBe(
      createPublicKey(ephemeral.jwtPrivateKey)
        .export({ type: 'spki', format: 'pem' })
        .toString(),
    );
  });

  it('no longer exposes jwtSecret (RS256, not HS256)', () => {
    const config = authConfig() as unknown as Record<string, unknown>;

    expect(config.jwtSecret).toBeUndefined();
  });
});
