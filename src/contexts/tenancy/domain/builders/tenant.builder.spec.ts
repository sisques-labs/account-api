import { FieldIsRequiredException } from '@sisques-labs/nestjs-kit';

import { TenantBuilder } from './tenant.builder';

const NOW = new Date('2024-01-01T00:00:00.000Z');
const APP_ID = '550e8400-e29b-41d4-a716-446655440010';

describe('TenantBuilder', () => {
  let builder: TenantBuilder;

  beforeEach(() => {
    builder = new TenantBuilder();
  });

  describe('build()', () => {
    it('should build a TenantAggregate when all required fields are set', () => {
      const tenant = builder
        .withId('550e8400-e29b-41d4-a716-446655440020')
        .withAppId(APP_ID)
        .withName('My Garden')
        .withSlug('my-garden')
        .withCreatedAt(NOW)
        .withUpdatedAt(NOW)
        .build();

      expect(tenant.slug.value).toBe('my-garden');
    });

    it('should throw when appId is missing', () => {
      expect(() =>
        builder
          .withId('550e8400-e29b-41d4-a716-446655440020')
          .withName('My Garden')
          .withSlug('my-garden')
          .withCreatedAt(NOW)
          .withUpdatedAt(NOW)
          .build(),
      ).toThrow(FieldIsRequiredException);
    });

    it('should throw when name is missing', () => {
      expect(() =>
        builder
          .withId('550e8400-e29b-41d4-a716-446655440020')
          .withAppId(APP_ID)
          .withSlug('my-garden')
          .withCreatedAt(NOW)
          .withUpdatedAt(NOW)
          .build(),
      ).toThrow(FieldIsRequiredException);
    });

    it('should throw when slug is missing', () => {
      expect(() =>
        builder
          .withId('550e8400-e29b-41d4-a716-446655440020')
          .withAppId(APP_ID)
          .withName('My Garden')
          .withCreatedAt(NOW)
          .withUpdatedAt(NOW)
          .build(),
      ).toThrow(FieldIsRequiredException);
    });
  });

  describe('buildViewModel()', () => {
    it('should always throw — no tenant read side exists in the MVP', () => {
      expect(() =>
        builder
          .withId('550e8400-e29b-41d4-a716-446655440020')
          .withAppId(APP_ID)
          .withName('My Garden')
          .withSlug('my-garden')
          .buildViewModel(),
      ).toThrow('not implemented');
    });
  });
});
