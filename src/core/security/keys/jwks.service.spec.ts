import { ISigningKeyPair } from './signing-key-pair.interface';
import { resolveSigningKeyPair } from './resolve-signing-key-pair';
import { JwksService } from './jwks.service';

describe('JwksService', () => {
  let service: JwksService;
  let keyPair: ISigningKeyPair;

  beforeEach(() => {
    service = new JwksService();
    keyPair = resolveSigningKeyPair({ NODE_ENV: 'development' });
  });

  it('returns a JWK with kty/use/alg/kid/n/e derived from the public key', async () => {
    const jwk = await service.execute(keyPair);

    expect(jwk).toEqual({
      kty: 'RSA',
      use: 'sig',
      alg: 'RS256',
      kid: keyPair.kid,
      n: expect.any(String),
      e: expect.any(String),
    });
  });

  it('never includes the private exponent `d` or other private fields', async () => {
    const jwk = (await service.execute(keyPair)) as unknown as Record<
      string,
      unknown
    >;

    expect(jwk.d).toBeUndefined();
    expect(jwk.p).toBeUndefined();
    expect(jwk.q).toBeUndefined();
  });

  it('derives different n values for two different key pairs (proves real derivation, not a stub)', async () => {
    const otherKeyPair = resolveSigningKeyPair({ NODE_ENV: 'development' });

    const jwk = await service.execute(keyPair);
    const otherJwk = await service.execute(otherKeyPair);

    expect(jwk.n).not.toBe(otherJwk.n);
  });
});
