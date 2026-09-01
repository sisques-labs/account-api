import { FieldIsRequiredException } from '@sisques-labs/nestjs-kit';

import { AppBuilder } from './app.builder';

const NOW = new Date('2024-01-01T00:00:00.000Z');

describe('AppBuilder', () => {
  let builder: AppBuilder;

  beforeEach(() => {
    builder = new AppBuilder();
  });

  describe('build()', () => {
    it('should build an AppAggregate when all required fields are set', () => {
      const app = builder
        .withId('550e8400-e29b-41d4-a716-446655440010')
        .withSlug('gardenia')
        .withName('Gardenia')
        .withCreatedAt(NOW)
        .withUpdatedAt(NOW)
        .build();

      expect(app.slug.value).toBe('gardenia');
    });

    it('should throw when slug is missing', () => {
      expect(() =>
        builder
          .withId('550e8400-e29b-41d4-a716-446655440010')
          .withName('Gardenia')
          .withCreatedAt(NOW)
          .withUpdatedAt(NOW)
          .build(),
      ).toThrow(FieldIsRequiredException);
    });

    it('should throw when name is missing', () => {
      expect(() =>
        builder
          .withId('550e8400-e29b-41d4-a716-446655440010')
          .withSlug('gardenia')
          .withCreatedAt(NOW)
          .withUpdatedAt(NOW)
          .build(),
      ).toThrow(FieldIsRequiredException);
    });
  });

  describe('buildViewModel()', () => {
    it('should build an AppViewModel when all required fields are set', () => {
      const viewModel = builder
        .withId('550e8400-e29b-41d4-a716-446655440010')
        .withSlug('gardenia')
        .withName('Gardenia')
        .withCreatedAt(NOW)
        .withUpdatedAt(NOW)
        .buildViewModel();

      expect(viewModel.slug).toBe('gardenia');
    });

    it('should throw when slug is missing', () => {
      expect(() =>
        builder
          .withId('550e8400-e29b-41d4-a716-446655440010')
          .withName('Gardenia')
          .buildViewModel(),
      ).toThrow(FieldIsRequiredException);
    });

    it('should throw when name is missing', () => {
      expect(() =>
        builder
          .withId('550e8400-e29b-41d4-a716-446655440010')
          .withSlug('gardenia')
          .buildViewModel(),
      ).toThrow(FieldIsRequiredException);
    });
  });
});
