import { createPublicKey, createVerify } from 'crypto';

import { IAccessTokenClaims } from '@core/security/access-token-claims.interface';
import { TokenSignService } from '@contexts/auth/application/services/write/token-sign/token-sign.service';

import { createE2EApp, E2EContext } from './helpers/app-bootstrap';

/**
 * RS256 signing + JWKS publication round trip. Signs a token through the
 * app's own `TokenSignService` (no Keycloak dependency needed — signing is
 * entirely local) and verifies its signature against the key published at
 * `GET /.well-known/jwks.json`, proving the published key is the one that
 * actually verifies issued tokens.
 */
describe('JWKS (e2e)', () => {
  let ctx: E2EContext;

  beforeAll(async () => {
    ctx = await createE2EApp();
  }, 60000);

  afterAll(async () => {
    await ctx.close();
  });

  it('publishes a JWKS with no private key material at /.well-known/jwks.json, unauthenticated', async () => {
    const res = await ctx.http().get('/.well-known/jwks.json');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.keys)).toBe(true);
    expect(res.body.keys.length).toBeGreaterThan(0);

    const key = res.body.keys[0];
    expect(key).toEqual(
      expect.objectContaining({
        kty: 'RSA',
        use: 'sig',
        alg: 'RS256',
        kid: expect.any(String),
        n: expect.any(String),
        e: expect.any(String),
      }),
    );
    expect(key.d).toBeUndefined();
  });

  it('is not reachable under the /api prefix', async () => {
    const res = await ctx.http().get('/api/.well-known/jwks.json');

    expect(res.status).toBe(404);
  });

  it('a token signed by TokenSignService verifies against the published public key', async () => {
    const jwksRes = await ctx.http().get('/.well-known/jwks.json');
    const publishedKey = jwksRes.body.keys[0] as {
      kty: string;
      n: string;
      e: string;
      kid: string;
    };

    const tokenSignService = ctx.app.get(TokenSignService);
    const claims: IAccessTokenClaims = {
      sub: 'user-under-test',
      email: 'jwks-e2e@example.com',
      platformAdmin: false,
      tenants: [],
    };
    const token = await tokenSignService.execute(claims);

    const [encodedHeader, encodedPayload, encodedSignature] = token.split('.');
    const header = JSON.parse(
      Buffer.from(encodedHeader, 'base64url').toString('utf8'),
    ) as { alg: string; kid: string };

    expect(header.alg).toBe('RS256');
    expect(header.kid).toBe(publishedKey.kid);

    const publicKeyObject = createPublicKey({
      key: {
        kty: publishedKey.kty,
        n: publishedKey.n,
        e: publishedKey.e,
      },
      format: 'jwk',
    });

    const verifier = createVerify('RSA-SHA256');
    verifier.update(`${encodedHeader}.${encodedPayload}`);
    verifier.end();
    const isValid = verifier.verify(
      publicKeyObject,
      Buffer.from(encodedSignature, 'base64url'),
    );

    expect(isValid).toBe(true);
  });
});
