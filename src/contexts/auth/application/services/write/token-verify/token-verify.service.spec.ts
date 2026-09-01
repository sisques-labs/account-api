import { JwtService } from '@nestjs/jwt';

import { TokenVerifyService } from './token-verify.service';

describe('TokenVerifyService', () => {
  let service: TokenVerifyService;
  let jwtService: jest.Mocked<JwtService>;

  beforeEach(() => {
    jwtService = {
      verify: jest.fn(),
    } as unknown as jest.Mocked<JwtService>;
    service = new TokenVerifyService(jwtService);
  });

  it('should verify and return the decoded claims', async () => {
    const claims = {
      sub: 'user-1',
      email: 'user@example.com',
      platformAdmin: true,
      tenants: [],
    };
    jwtService.verify.mockReturnValue(claims);

    await expect(service.execute('a.jwt.token')).resolves.toEqual(claims);
  });
});
