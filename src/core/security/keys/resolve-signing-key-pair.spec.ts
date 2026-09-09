import { createPublicKey } from 'crypto';

import { resolveSigningKeyPair } from './resolve-signing-key-pair';

function toBase64Pem(pem: string): string {
  return Buffer.from(pem, 'utf8').toString('base64');
}

describe('resolveSigningKeyPair', () => {
  describe('production without JWT_PRIVATE_KEY', () => {
    it('throws — fails closed instead of generating an ephemeral key', () => {
      expect(() => resolveSigningKeyPair({ NODE_ENV: 'production' })).toThrow(
        /JWT_PRIVATE_KEY/,
      );
    });
  });

  describe('non-production without JWT_PRIVATE_KEY', () => {
    it('generates an ephemeral RSA keypair', () => {
      const result = resolveSigningKeyPair({ NODE_ENV: 'development' });

      expect(result.privateKeyPem).toContain('PRIVATE KEY');
      expect(result.publicKeyPem).toContain('PUBLIC KEY');
      expect(result.kid.length).toBeGreaterThan(0);
    });

    it('derives a kid that is deterministic for the same key material', () => {
      const ephemeral = resolveSigningKeyPair({ NODE_ENV: 'development' });
      const encoded = toBase64Pem(ephemeral.privateKeyPem);

      const first = resolveSigningKeyPair({
        NODE_ENV: 'production',
        JWT_PRIVATE_KEY: encoded,
      });
      const second = resolveSigningKeyPair({
        NODE_ENV: 'production',
        JWT_PRIVATE_KEY: encoded,
      });

      expect(first.kid).toBe(second.kid);
    });

    it('derives a different kid for two different ephemeral keypairs', () => {
      const first = resolveSigningKeyPair({ NODE_ENV: 'development' });
      const second = resolveSigningKeyPair({ NODE_ENV: 'development' });

      expect(first.kid).not.toBe(second.kid);
    });

    it('derives the public key from the private key via crypto.createPublicKey', () => {
      const result = resolveSigningKeyPair({ NODE_ENV: 'development' });

      const expectedPublicKeyPem = createPublicKey(result.privateKeyPem)
        .export({ type: 'spki', format: 'pem' })
        .toString();

      expect(result.publicKeyPem).toBe(expectedPublicKeyPem);
    });
  });

  describe('JWT_PRIVATE_KEY set (base64-encoded PEM)', () => {
    it('decodes it and derives the matching public key and kid', () => {
      const ephemeral = resolveSigningKeyPair({ NODE_ENV: 'development' });
      const encoded = toBase64Pem(ephemeral.privateKeyPem);

      const result = resolveSigningKeyPair({
        NODE_ENV: 'production',
        JWT_PRIVATE_KEY: encoded,
      });

      expect(result.privateKeyPem).toBe(ephemeral.privateKeyPem);
      expect(result.publicKeyPem).toBe(ephemeral.publicKeyPem);
      expect(result.kid).toBe(ephemeral.kid);
    });
  });
});
