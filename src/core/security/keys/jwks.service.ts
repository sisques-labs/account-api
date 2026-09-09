import { createPublicKey } from 'crypto';

import { JsonWebKeyDto } from '@core/security/transport/rest/dtos/json-web-key.dto';
import { Injectable } from '@nestjs/common';
import { IBaseService } from '@sisques-labs/nestjs-kit';

import { ISigningKeyPair } from './signing-key-pair.interface';

/** Input the JWKS conversion needs — deliberately excludes `privateKeyPem`. */
export type PublicSigningKey = Pick<ISigningKeyPair, 'publicKeyPem' | 'kid'>;

/**
 * Converts the RSA public key into a publishable JWK entry
 * (`kty`/`use`/`alg`/`kid`/`n`/`e`). The input type structurally excludes
 * `privateKeyPem`, so it cannot leak private key material even by mistake.
 */
@Injectable()
export class JwksService implements IBaseService<
  PublicSigningKey,
  JsonWebKeyDto
> {
  async execute(keyPair: PublicSigningKey): Promise<JsonWebKeyDto> {
    const jwk = createPublicKey(keyPair.publicKeyPem).export({
      format: 'jwk',
    }) as { n: string; e: string };

    const key = new JsonWebKeyDto();
    key.kty = 'RSA';
    key.use = 'sig';
    key.alg = 'RS256';
    key.kid = keyPair.kid;
    key.n = jwk.n;
    key.e = jwk.e;
    return key;
  }
}
