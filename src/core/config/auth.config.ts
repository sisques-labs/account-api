import { registerAs } from '@nestjs/config';

export const authConfig = registerAs('auth', () => ({
  jwtSecret: process.env.JWT_SECRET ?? 'dev-insecure-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
  refreshTokenTtlDays: parseInt(process.env.REFRESH_TOKEN_TTL_DAYS ?? '30', 10),
  cookieDomain: process.env.COOKIE_DOMAIN,
  keycloak: {
    baseUrl: process.env.KEYCLOAK_BASE_URL ?? 'http://localhost:8083',
    realm: process.env.KEYCLOAK_REALM ?? 'sisques-account',
    clientId: process.env.KEYCLOAK_CLIENT_ID ?? 'account-api',
    clientSecret: process.env.KEYCLOAK_CLIENT_SECRET ?? '',
  },
}));
