import { resolveSigningKeyPair } from '@core/security/keys/resolve-signing-key-pair';
import { registerAs } from '@nestjs/config';

export const authConfig = registerAs('auth', () => {
  const signingKeyPair = resolveSigningKeyPair({
    JWT_PRIVATE_KEY: process.env.JWT_PRIVATE_KEY,
    NODE_ENV: process.env.NODE_ENV,
  });

  return {
    jwtPrivateKey: signingKeyPair.privateKeyPem,
    jwtPublicKey: signingKeyPair.publicKeyPem,
    jwtKeyId: signingKeyPair.kid,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
    refreshTokenTtlDays: parseInt(
      process.env.REFRESH_TOKEN_TTL_DAYS ?? '30',
      10,
    ),
    cookieDomain: process.env.COOKIE_DOMAIN,
    keycloak: {
      baseUrl: process.env.KEYCLOAK_BASE_URL ?? 'http://localhost:8084',
      realm: process.env.KEYCLOAK_REALM ?? 'sisques-account',
      clientId: process.env.KEYCLOAK_CLIENT_ID ?? 'account-api',
      clientSecret: process.env.KEYCLOAK_CLIENT_SECRET ?? '',
    },
  };
});
