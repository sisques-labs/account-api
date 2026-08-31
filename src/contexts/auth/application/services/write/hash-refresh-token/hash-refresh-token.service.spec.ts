import { HashRefreshTokenService } from './hash-refresh-token.service';

describe('HashRefreshTokenService', () => {
  let service: HashRefreshTokenService;

  beforeEach(() => {
    service = new HashRefreshTokenService();
  });

  it('should produce a 64-char lowercase hex SHA-256 digest', () => {
    const hash = service.execute('some-raw-token');

    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('should be deterministic for the same input', () => {
    expect(service.execute('same-token')).toBe(service.execute('same-token'));
  });

  it('should produce different hashes for different inputs', () => {
    expect(service.execute('token-a')).not.toBe(service.execute('token-b'));
  });
});
