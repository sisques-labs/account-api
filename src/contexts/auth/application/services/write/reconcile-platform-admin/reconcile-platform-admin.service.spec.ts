import { ReconcilePlatformAdminService } from './reconcile-platform-admin.service';

describe('ReconcilePlatformAdminService', () => {
  let service: ReconcilePlatformAdminService;

  beforeEach(() => {
    service = new ReconcilePlatformAdminService();
  });

  describe('PLATFORM_ADMIN_EMAILS unset (null)', () => {
    it('returns null and skips reconciliation when the flag is currently true', async () => {
      const result = await service.execute({
        email: 'user@example.com',
        currentPlatformAdmin: true,
        platformAdminEmails: null,
      });

      expect(result).toBeNull();
    });

    it('returns null and skips reconciliation when the flag is currently false', async () => {
      const result = await service.execute({
        email: 'user@example.com',
        currentPlatformAdmin: false,
        platformAdminEmails: null,
      });

      expect(result).toBeNull();
    });
  });

  describe('PLATFORM_ADMIN_EMAILS set to an empty list', () => {
    it('revokes (returns false) when the flag is currently true', async () => {
      const result = await service.execute({
        email: 'user@example.com',
        currentPlatformAdmin: true,
        platformAdminEmails: [],
      });

      expect(result).toBe(false);
    });

    it('returns null (no-op) when the flag is already false', async () => {
      const result = await service.execute({
        email: 'user@example.com',
        currentPlatformAdmin: false,
        platformAdminEmails: [],
      });

      expect(result).toBeNull();
    });
  });

  describe('PLATFORM_ADMIN_EMAILS populated, email present in the list', () => {
    it('grants (returns true) when the flag is currently false', async () => {
      const result = await service.execute({
        email: 'admin@example.com',
        currentPlatformAdmin: false,
        platformAdminEmails: ['admin@example.com'],
      });

      expect(result).toBe(true);
    });

    it('returns null (no-op) when the flag is already true', async () => {
      const result = await service.execute({
        email: 'admin@example.com',
        currentPlatformAdmin: true,
        platformAdminEmails: ['admin@example.com'],
      });

      expect(result).toBeNull();
    });

    it('matches case-insensitively against the configured allowlist', async () => {
      const result = await service.execute({
        email: 'Admin@Example.com',
        currentPlatformAdmin: false,
        platformAdminEmails: ['admin@example.com'],
      });

      expect(result).toBe(true);
    });
  });

  describe('PLATFORM_ADMIN_EMAILS populated, email absent from the list', () => {
    it('revokes (returns false) when the flag is currently true', async () => {
      const result = await service.execute({
        email: 'former-admin@example.com',
        currentPlatformAdmin: true,
        platformAdminEmails: ['other@example.com'],
      });

      expect(result).toBe(false);
    });

    it('returns null (no-op) when the flag is already false', async () => {
      const result = await service.execute({
        email: 'never-admin@example.com',
        currentPlatformAdmin: false,
        platformAdminEmails: ['other@example.com'],
      });

      expect(result).toBeNull();
    });
  });
});
