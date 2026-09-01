import { authConfig } from './auth.config';

describe('authConfig', () => {
  const ORIGINAL_ENV = { ...process.env };

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it('should fall back to defaults when no env vars are set', () => {
    delete process.env.JWT_SECRET;
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
    process.env.JWT_SECRET = 'secret-123';
    process.env.JWT_EXPIRES_IN = '10m';
    process.env.REFRESH_TOKEN_TTL_DAYS = '7';
    process.env.KEYCLOAK_BASE_URL = 'http://keycloak:8080';
    process.env.KEYCLOAK_REALM = 'custom-realm';
    process.env.KEYCLOAK_CLIENT_ID = 'custom-client';
    process.env.KEYCLOAK_CLIENT_SECRET = 'super-secret';

    const config = authConfig();

    expect(config.jwtSecret).toBe('secret-123');
    expect(config.jwtExpiresIn).toBe('10m');
    expect(config.refreshTokenTtlDays).toBe(7);
    expect(config.keycloak).toEqual({
      baseUrl: 'http://keycloak:8080',
      realm: 'custom-realm',
      clientId: 'custom-client',
      clientSecret: 'super-secret',
    });
  });
});
