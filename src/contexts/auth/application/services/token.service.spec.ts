import { JwtService } from '@nestjs/jwt';

import { TokenService } from './token.service';

describe('TokenService', () => {
  let service: TokenService;
  let jwtService: jest.Mocked<JwtService>;

  beforeEach(() => {
    jwtService = {
      sign: jest.fn(),
      verify: jest.fn(),
    } as unknown as jest.Mocked<JwtService>;
    service = new TokenService(jwtService);
  });

  it('should sign claims via JwtService', () => {
    jwtService.sign.mockReturnValue('signed.jwt.token');
    const claims = {
      sub: 'user-1',
      email: 'user@example.com',
      platformAdmin: false,
      tenants: [{ tenantId: 'tenant-1', role: 'owner' }],
    };

    const token = service.sign(claims);

    expect(token).toBe('signed.jwt.token');
    expect(jwtService.sign).toHaveBeenCalledWith(
      expect.objectContaining(claims),
    );
  });

  it('should verify and return the decoded claims', () => {
    const claims = {
      sub: 'user-1',
      email: 'user@example.com',
      platformAdmin: true,
      tenants: [],
    };
    jwtService.verify.mockReturnValue(claims);

    expect(service.verify('a.jwt.token')).toEqual(claims);
  });
});
