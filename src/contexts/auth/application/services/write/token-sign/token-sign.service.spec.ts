import { JwtService } from '@nestjs/jwt';

import { TokenSignService } from './token-sign.service';

describe('TokenSignService', () => {
  let service: TokenSignService;
  let jwtService: jest.Mocked<JwtService>;

  beforeEach(() => {
    jwtService = {
      sign: jest.fn(),
    } as unknown as jest.Mocked<JwtService>;
    service = new TokenSignService(jwtService);
  });

  it('should sign claims via JwtService', async () => {
    jwtService.sign.mockReturnValue('signed.jwt.token');
    const claims = {
      sub: 'user-1',
      email: 'user@example.com',
      platformAdmin: false,
      tenants: [{ tenantId: 'tenant-1', role: 'owner' }],
    };

    const token = await service.execute(claims);

    expect(token).toBe('signed.jwt.token');
    expect(jwtService.sign).toHaveBeenCalledWith(
      expect.objectContaining(claims),
    );
  });
});
