import { createHash, createPublicKey, generateKeyPairSync } from 'crypto';

import { ISigningKeyPair } from './signing-key-pair.interface';

/**
 * RFC 7638 JWK thumbprint of an RSA public key, used as `kid`. Only the
 * three required members (`e`, `kty`, `n`) participate, sorted
 * lexicographically with no whitespace, per the RFC — so the same key
 * material always yields the same `kid`, and it rotates automatically when
 * the key changes.
 */
function computeRsaJwkThumbprint(publicKeyPem: string): string {
  const jwk = createPublicKey(publicKeyPem).export({ format: 'jwk' }) as {
    e: string;
    kty: string;
    n: string;
  };
  const canonical = JSON.stringify({ e: jwk.e, kty: jwk.kty, n: jwk.n });
  return createHash('sha256').update(canonical).digest('base64url');
}

function generateEphemeralKeyPair(): {
  privateKeyPem: string;
  publicKeyPem: string;
} {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    publicKeyEncoding: { type: 'spki', format: 'pem' },
  });
  return { privateKeyPem: privateKey, publicKeyPem: publicKey };
}

/**
 * Resolves the RSA key pair used to sign/verify access tokens.
 *
 * - `JWT_PRIVATE_KEY` set: decoded from base64 PEM; the public key is
 *   derived from it via `crypto.createPublicKey`, never a second env var
 *   that could drift.
 * - `JWT_PRIVATE_KEY` absent outside production: an ephemeral keypair is
 *   generated for the process lifetime (dev/test convenience).
 * - `JWT_PRIVATE_KEY` absent in production: fails closed.
 */
export function resolveSigningKeyPair(env: {
  JWT_PRIVATE_KEY?: string;
  NODE_ENV?: string;
}): ISigningKeyPair {
  if (env.JWT_PRIVATE_KEY?.trim()) {
    const privateKeyPem = Buffer.from(env.JWT_PRIVATE_KEY, 'base64').toString(
      'utf8',
    );
    const publicKeyPem = createPublicKey(privateKeyPem)
      .export({ type: 'spki', format: 'pem' })
      .toString();

    return {
      privateKeyPem,
      publicKeyPem,
      kid: computeRsaJwkThumbprint(publicKeyPem),
    };
  }

  if (env.NODE_ENV === 'production') {
    throw new Error(
      'JWT_PRIVATE_KEY is required when NODE_ENV is "production" — refusing to start without an explicit signing key.',
    );
  }

  const { privateKeyPem, publicKeyPem } = generateEphemeralKeyPair();

  return {
    privateKeyPem,
    publicKeyPem,
    kid: computeRsaJwkThumbprint(publicKeyPem),
  };
}
