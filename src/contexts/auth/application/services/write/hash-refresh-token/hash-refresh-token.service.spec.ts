import { HashRefreshTokenService } from './hash-refresh-token.service';

describe('HashRefreshTokenService', () => {
  let service: HashRefreshTokenService;

  beforeEach(() => {
    service = new HashRefreshTokenService();
  });

  it('should produce a 64-char lowercase hex SHA-256 digest', async () => {
    const hash = await service.execute('some-raw-token');

    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('should be deterministic for the same input', async () => {
    expect(await service.execute('same-token')).toBe(
      await service.execute('same-token'),
    );
  });

  it('should produce different hashes for different inputs', async () => {
    expect(await service.execute('token-a')).not.toBe(
      await service.execute('token-b'),
    );
  });
});
