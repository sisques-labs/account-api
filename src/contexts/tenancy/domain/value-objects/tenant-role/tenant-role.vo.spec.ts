import { TenantRoleValueObject } from './tenant-role.vo';

describe('TenantRoleValueObject', () => {
  describe('isOwner()', () => {
    it('should return true for "owner"', () => {
      expect(new TenantRoleValueObject('owner').isOwner()).toBe(true);
    });

    it('should return true for "OWNER" (case-insensitive)', () => {
      expect(new TenantRoleValueObject('OWNER').isOwner()).toBe(true);
    });

    it('should return false for any other role', () => {
      expect(new TenantRoleValueObject('member').isOwner()).toBe(false);
      expect(new TenantRoleValueObject('admin').isOwner()).toBe(false);
    });
  });

  it('should reject an empty role', () => {
    expect(() => new TenantRoleValueObject('')).toThrow();
  });
});
