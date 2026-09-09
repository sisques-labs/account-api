import { resolveSigningKeyPair } from '@core/security/keys/resolve-signing-key-pair';
import { registerAs } from '@nestjs/config';

// `undefined` (var absent from process.env) MUST stay distinguishable from
// an explicit empty string: absent means "skip reconciliation entirely",
// empty means "revoke every platform admin". See
// specs/platform-admin-bootstrap/spec.md.
function parsePlatformAdminEmails(raw: string | undefined): string[] | null {
  if (raw === undefined) return null;

  return raw
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter((email) => email.length > 0);
}

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
    platformAdminEmails: parsePlatformAdminEmails(
      process.env.PLATFORM_ADMIN_EMAILS,
    ),
    keycloak: {
      baseUrl: process.env.KEYCLOAK_BASE_URL ?? 'http://localhost:8084',
      realm: process.env.KEYCLOAK_REALM ?? 'sisques-account',
      clientId: process.env.KEYCLOAK_CLIENT_ID ?? 'account-api',
      clientSecret: process.env.KEYCLOAK_CLIENT_SECRET ?? '',
    },
  };
});
