import {
  InvalidStringException,
  StringValueObject,
} from '@sisques-labs/nestjs-kit';

import { TenantNameValueObject } from './tenant-name.vo';

const createName = (value: string) => new TenantNameValueObject(value);

describe('TenantNameValueObject', () => {
  describe('construction', () => {
    it.each(['My Garden', 'A', 'Tenant #1', 'Acme Co.', 'José García'])(
      'should accept a valid tenant name (%s)',
      (name) => {
        const valueObject = createName(name);

        expect(valueObject).toBeInstanceOf(TenantNameValueObject);
        expect(valueObject.value).toBe(name);
        expect(valueObject.isNotEmpty()).toBe(true);
      },
    );

    it('should trim surrounding whitespace', () => {
      expect(createName('  My Garden  ').value).toBe('My Garden');
    });

    it('should accept a name with exactly 150 characters', () => {
      const name = 'a'.repeat(150);

      expect(createName(name).value).toBe(name);
      expect(createName(name).length()).toBe(150);
    });
  });

  describe('validation', () => {
    it.each(['', '   '])(
      'should reject an empty or whitespace-only value (%j)',
      (value) => {
        expect(() => createName(value)).toThrow(InvalidStringException);
      },
    );

    it('should reject names longer than 150 characters', () => {
      const tooLong = 'a'.repeat(151);

      expect(() => createName(tooLong)).toThrow(InvalidStringException);
    });
  });

  describe('StringValueObject behaviour', () => {
    it('should compare equal names as equal', () => {
      const left = createName('My Garden');
      const right = createName('My Garden');

      expect(left.equals(right)).toBe(true);
    });

    it('should compare different names as not equal', () => {
      const left = createName('My Garden');
      const right = createName('Other Garden');

      expect(left.equals(right)).toBe(false);
    });

    it('should report the stored length after trimming', () => {
      expect(createName('  My Garden  ').length()).toBe('My Garden'.length);
    });

    it('should detect contained substrings', () => {
      expect(createName('My Garden').contains('Garden')).toBe(true);
      expect(createName('My Garden').contains('Other')).toBe(false);
    });

    it('should capitalize the name', () => {
      expect(createName('my garden').capitalize().value).toBe('My garden');
    });
  });

  describe('inheritance from StringValueObject', () => {
    it('should apply the tenant name length constraints from the base class', () => {
      const tenantName = createName('My Garden');
      const baseName = new StringValueObject('My Garden', {
        minLength: 1,
        maxLength: 150,
        trim: true,
      });

      expect(tenantName.value).toBe(baseName.value);
      expect(tenantName.length()).toBe(baseName.length());
    });
  });
});
