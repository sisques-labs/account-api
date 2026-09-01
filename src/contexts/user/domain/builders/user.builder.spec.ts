import { FieldIsRequiredException } from '@sisques-labs/nestjs-kit';

import { UserBuilder } from './user.builder';

const NOW = new Date('2024-01-01T00:00:00.000Z');

describe('UserBuilder', () => {
  let builder: UserBuilder;

  beforeEach(() => {
    builder = new UserBuilder();
  });

  describe('build()', () => {
    it('should build a UserAggregate when all required fields are set', () => {
      const user = builder
        .withId('550e8400-e29b-41d4-a716-446655440000')
        .withExternalId('kc-sub-1')
        .withEmail('user@example.com')
        .withDisplayName('User')
        .withCreatedAt(NOW)
        .withUpdatedAt(NOW)
        .build();

      expect(user.email.value).toBe('user@example.com');
    });

    it('should throw when externalId is missing', () => {
      expect(() =>
        builder
          .withId('550e8400-e29b-41d4-a716-446655440000')
          .withEmail('user@example.com')
          .withDisplayName('User')
          .withCreatedAt(NOW)
          .withUpdatedAt(NOW)
          .build(),
      ).toThrow(FieldIsRequiredException);
    });

    it('should throw when email is missing', () => {
      expect(() =>
        builder
          .withId('550e8400-e29b-41d4-a716-446655440000')
          .withExternalId('kc-sub-1')
          .withDisplayName('User')
          .withCreatedAt(NOW)
          .withUpdatedAt(NOW)
          .build(),
      ).toThrow(FieldIsRequiredException);
    });

    it('should build with displayName undefined when not provided', () => {
      const user = builder
        .withId('550e8400-e29b-41d4-a716-446655440000')
        .withExternalId('kc-sub-1')
        .withEmail('user@example.com')
        .withCreatedAt(NOW)
        .withUpdatedAt(NOW)
        .build();

      expect(user.displayName).toBeUndefined();
    });
  });

  describe('buildViewModel()', () => {
    it('should build a UserViewModel when all required fields are set', () => {
      const viewModel = builder
        .withId('550e8400-e29b-41d4-a716-446655440000')
        .withExternalId('kc-sub-1')
        .withEmail('user@example.com')
        .withDisplayName('User')
        .withCreatedAt(NOW)
        .withUpdatedAt(NOW)
        .buildViewModel();

      expect(viewModel.email).toBe('user@example.com');
    });

    it('should throw when externalId is missing', () => {
      expect(() =>
        builder
          .withId('550e8400-e29b-41d4-a716-446655440000')
          .withEmail('user@example.com')
          .withDisplayName('User')
          .buildViewModel(),
      ).toThrow(FieldIsRequiredException);
    });

    it('should throw when email is missing', () => {
      expect(() =>
        builder
          .withId('550e8400-e29b-41d4-a716-446655440000')
          .withExternalId('kc-sub-1')
          .withDisplayName('User')
          .buildViewModel(),
      ).toThrow(FieldIsRequiredException);
    });

    it('should build with displayName null when not provided', () => {
      const viewModel = builder
        .withId('550e8400-e29b-41d4-a716-446655440000')
        .withExternalId('kc-sub-1')
        .withEmail('user@example.com')
        .withCreatedAt(NOW)
        .withUpdatedAt(NOW)
        .buildViewModel();

      expect(viewModel.displayName).toBeNull();
    });
  });
});
