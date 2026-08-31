import {
  InvalidStringException,
  SlugValueObject,
} from '@sisques-labs/nestjs-kit';
import { TenantSlugValueObject } from './tenant-slug.vo';

const createSlug = (value: string) => new TenantSlugValueObject(value);

describe('TenantSlugValueObject', () => {
  describe('construction', () => {
    it.each(['my-garden', 'gardenia', 'tenant-2', 'a1', 'my-tenant-name'])(
      'should accept a valid slug (%s)',
      (slug) => {
        const valueObject = createSlug(slug);

        expect(valueObject).toBeInstanceOf(TenantSlugValueObject);
        expect(valueObject.value).toBe(slug);
        expect(valueObject.isValidSlug()).toBe(true);
      },
    );
  });

  describe('validation', () => {
    it.each(['', '   '])(
      'should reject an empty or whitespace-only value (%j)',
      (value) => {
        expect(() => createSlug(value)).toThrow(InvalidStringException);
      },
    );

    it.each([
      'My-Garden',
      'UPPERCASE',
      '-leading',
      'trailing-',
      'has spaces',
      'special@chars',
      'under_score',
      '---',
    ])('should reject an invalid slug format (%s)', (value) => {
      expect(() => createSlug(value)).toThrow(InvalidStringException);
    });

    it('should reject slugs longer than 100 characters', () => {
      const tooLong = 'a'.repeat(101);

      expect(() => createSlug(tooLong)).toThrow(InvalidStringException);
    });
  });

  describe('generateSlug()', () => {
    it.each([
      ['My Garden', 'my-garden'],
      ['  Hello World  ', 'hello-world'],
      ['foo_bar', 'foo-bar'],
      ['Hello!!!World', 'helloworld'],
      ['Multiple   Spaces', 'multiple-spaces'],
      ['Already-a-slug', 'already-a-slug'],
    ])('should normalize %j into %s', (input, expected) => {
      expect(TenantSlugValueObject.generateSlug(input)).toBe(expected);
    });

    it.each(['', '   ', null, undefined])(
      'should return an empty string for empty input (%j)',
      (input) => {
        expect(
          TenantSlugValueObject.generateSlug(input as unknown as string),
        ).toBe('');
      },
    );
  });

  describe('fromString()', () => {
    it('should build a valid slug from arbitrary text', () => {
      const slug = TenantSlugValueObject.fromString('My Tenant Name');

      expect(slug).toBeInstanceOf(SlugValueObject);
      expect(slug.value).toBe('my-tenant-name');
    });

    it('should reject text that normalizes to an empty slug', () => {
      expect(() => TenantSlugValueObject.fromString('!!!')).toThrow(
        InvalidStringException,
      );
    });
  });

  describe('slug helpers', () => {
    it('should count hyphen-separated words', () => {
      expect(createSlug('my-garden').getWordCount()).toBe(2);
      expect(createSlug('gardenia').getWordCount()).toBe(1);
    });

    it('should convert the slug to a human-readable label', () => {
      expect(createSlug('my-garden').toHumanReadable().value).toBe('My Garden');
    });

    it('should append a normalized suffix', () => {
      const slug = createSlug('my-garden').addSuffix('Team 2');

      expect(slug.value).toBe('my-garden-team-2');
      expect(slug.isValidSlug()).toBe(true);
    });

    it('should prepend a normalized prefix', () => {
      const slug = createSlug('my-garden').addPrefix('Acme Co');

      expect(slug.value).toBe('acme-co-my-garden');
      expect(slug.isValidSlug()).toBe(true);
    });

    it('should return the same slug when suffix normalizes to empty', () => {
      const original = createSlug('my-garden');
      const unchanged = original.addSuffix('!!!');

      expect(unchanged.value).toBe(original.value);
    });

    it('should compare equal slugs as equal', () => {
      const left = createSlug('my-garden');
      const right = createSlug('my-garden');

      expect(left.equals(right)).toBe(true);
    });

    it('should compare different slugs as not equal', () => {
      const left = createSlug('my-garden');
      const right = createSlug('other-garden');

      expect(left.equals(right)).toBe(false);
    });
  });

  describe('inheritance from SlugValueObject', () => {
    it('should expose the same slug rules as the base SlugValueObject', () => {
      const tenantSlug = createSlug('my-garden');
      const baseSlug = new SlugValueObject('my-garden');

      expect(tenantSlug.value).toBe(baseSlug.value);
      expect(tenantSlug.isValidSlug()).toBe(baseSlug.isValidSlug());
    });
  });
});
