import { GenerateRefreshTokenService } from './generate-refresh-token.service';

describe('GenerateRefreshTokenService', () => {
  let service: GenerateRefreshTokenService;

  beforeEach(() => {
    service = new GenerateRefreshTokenService();
  });

  it('should generate a non-empty base64url token', () => {
    const token = service.execute();

    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(30);
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('should generate a different token on each call', () => {
    expect(service.execute()).not.toBe(service.execute());
  });
});
