import { ConfigService } from '@nestjs/config';

import { JsonWebKeyDto } from '@core/security/transport/rest/dtos/json-web-key.dto';
import { JwksService } from '@core/security/keys/jwks.service';

import { JwksController } from './jwks.controller';

describe('JwksController', () => {
  let controller: JwksController;
  let config: jest.Mocked<ConfigService>;
  let jwksService: jest.Mocked<JwksService>;

  beforeEach(() => {
    config = {
      getOrThrow: jest.fn(),
    } as unknown as jest.Mocked<ConfigService>;
    jwksService = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<JwksService>;
    controller = new JwksController(config, jwksService);
  });

  describe('jwks()', () => {
    it('reads the public key/kid from config and returns them wrapped in a keys array', async () => {
      config.getOrThrow.mockImplementation((key: string) => {
        if (key === 'auth.jwtPublicKey') return 'public-pem';
        if (key === 'auth.jwtKeyId') return 'key-id-123';
        throw new Error(`unexpected key ${key}`);
      });
      const key = new JsonWebKeyDto();
      key.kty = 'RSA';
      key.use = 'sig';
      key.alg = 'RS256';
      key.kid = 'key-id-123';
      key.n = 'n-value';
      key.e = 'AQAB';
      jwksService.execute.mockResolvedValue(key);

      const response = await controller.jwks();

      expect(jwksService.execute).toHaveBeenCalledWith({
        publicKeyPem: 'public-pem',
        kid: 'key-id-123',
      });
      expect(response).toEqual({ keys: [key] });
    });

    it('never includes a `d` field in the response', async () => {
      config.getOrThrow.mockReturnValue('irrelevant');
      const key = new JsonWebKeyDto();
      key.kty = 'RSA';
      key.use = 'sig';
      key.alg = 'RS256';
      key.kid = 'other-key';
      key.n = 'other-n';
      key.e = 'AQAB';
      jwksService.execute.mockResolvedValue(key);

      const response = await controller.jwks();

      expect(
        (response.keys[0] as unknown as Record<string, unknown>).d,
      ).toBeUndefined();
    });
  });
});
