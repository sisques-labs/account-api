import { TenantRoleEnum } from '@contexts/tenancy/domain/enums/tenant-role.enum';
import { InvalidEnumValueException } from '@sisques-labs/nestjs-kit';

import { TenantRoleValueObject } from './tenant-role.vo';

const createRole = (value: TenantRoleEnum) => new TenantRoleValueObject(value);

const createInvalidRole = (value: string) =>
  new TenantRoleValueObject(value as unknown as TenantRoleEnum);

describe('TenantRoleValueObject', () => {
  describe('construction', () => {
    it.each([
      [TenantRoleEnum.OWNER, TenantRoleEnum.OWNER],
      [TenantRoleEnum.MEMBER, TenantRoleEnum.MEMBER],
      [TenantRoleEnum.ADMIN, TenantRoleEnum.ADMIN],
    ])('should accept the valid enum value %s', (input, expected) => {
      expect(createRole(input).value).toBe(expected);
    });
  });

  describe('isOwner()', () => {
    it('should return true for OWNER', () => {
      expect(createRole(TenantRoleEnum.OWNER).isOwner()).toBe(true);
    });

    it.each([TenantRoleEnum.MEMBER, TenantRoleEnum.ADMIN])(
      'should return false for %s',
      (role) => {
        expect(createRole(role).isOwner()).toBe(false);
      },
    );
  });

  describe('isMember()', () => {
    it('should return true for MEMBER', () => {
      expect(createRole(TenantRoleEnum.MEMBER).isMember()).toBe(true);
    });

    it.each([TenantRoleEnum.OWNER, TenantRoleEnum.ADMIN])(
      'should return false for %s',
      (role) => {
        expect(createRole(role).isMember()).toBe(false);
      },
    );
  });

  describe('isAdmin()', () => {
    it('should return true for ADMIN', () => {
      expect(createRole(TenantRoleEnum.ADMIN).isAdmin()).toBe(true);
    });

    it.each([TenantRoleEnum.OWNER, TenantRoleEnum.MEMBER])(
      'should return false for %s',
      (role) => {
        expect(createRole(role).isAdmin()).toBe(false);
      },
    );
  });

  describe('role predicates', () => {
    it.each([
      {
        role: TenantRoleEnum.OWNER,
        isOwner: true,
        isMember: false,
        isAdmin: false,
      },
      {
        role: TenantRoleEnum.MEMBER,
        isOwner: false,
        isMember: true,
        isAdmin: false,
      },
      {
        role: TenantRoleEnum.ADMIN,
        isOwner: false,
        isMember: false,
        isAdmin: true,
      },
    ])(
      'should expose mutually exclusive predicates for $role',
      ({ role, isOwner, isMember, isAdmin }) => {
        const valueObject = createRole(role);

        expect(valueObject.isOwner()).toBe(isOwner);
        expect(valueObject.isMember()).toBe(isMember);
        expect(valueObject.isAdmin()).toBe(isAdmin);
      },
    );
  });

  describe('validation', () => {
    it.each(['', '   '])(
      'should reject an empty or whitespace-only value (%j)',
      (value) => {
        expect(() => createInvalidRole(value)).toThrow(
          InvalidEnumValueException,
        );
      },
    );

    it.each(['owner', 'member', 'admin', 'UNKNOWN', 'guest'])(
      'should reject an invalid enum value (%s)',
      (value) => {
        expect(() => createInvalidRole(value)).toThrow(
          InvalidEnumValueException,
        );
      },
    );
  });

  describe('EnumValueObject behaviour', () => {
    it('should compare equal values as equal', () => {
      const left = createRole(TenantRoleEnum.OWNER);
      const right = createRole(TenantRoleEnum.OWNER);

      expect(left.equals(right)).toBe(true);
    });

    it('should compare different values as not equal', () => {
      const owner = createRole(TenantRoleEnum.OWNER);
      const member = createRole(TenantRoleEnum.MEMBER);

      expect(owner.equals(member)).toBe(false);
    });

    it.each([
      [TenantRoleEnum.OWNER, 'OWNER'],
      [TenantRoleEnum.MEMBER, 'MEMBER'],
      [TenantRoleEnum.ADMIN, 'ADMIN'],
    ])('should resolve the enum key for %s', (role, expectedKey) => {
      expect(createRole(role).getKey()).toBe(expectedKey);
    });

    it('should expose every enum value', () => {
      expect(createRole(TenantRoleEnum.OWNER).getAllValues()).toEqual([
        TenantRoleEnum.OWNER,
        TenantRoleEnum.MEMBER,
        TenantRoleEnum.ADMIN,
      ]);
    });

    it('should identify the current value with is()', () => {
      const role = createRole(TenantRoleEnum.ADMIN);

      expect(role.is(TenantRoleEnum.ADMIN)).toBe(true);
      expect(role.is(TenantRoleEnum.OWNER)).toBe(false);
    });
  });
});
