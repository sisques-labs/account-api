import { FieldIsRequiredException } from '@sisques-labs/nestjs-kit';

import { TenantMembershipBuilder } from './tenant-membership.builder';

const NOW = new Date('2024-01-01T00:00:00.000Z');
const TENANT_ID = '550e8400-e29b-41d4-a716-446655440020';
const USER_ID = '550e8400-e29b-41d4-a716-446655440000';

describe('TenantMembershipBuilder', () => {
  let builder: TenantMembershipBuilder;

  beforeEach(() => {
    builder = new TenantMembershipBuilder();
  });

  describe('build()', () => {
    it('should build a TenantMembershipAggregate when all required fields are set', () => {
      const membership = builder
        .withId('550e8400-e29b-41d4-a716-446655440030')
        .withTenantId(TENANT_ID)
        .withUserId(USER_ID)
        .withRole('owner')
        .withCreatedAt(NOW)
        .withUpdatedAt(NOW)
        .build();

      expect(membership.role.value).toBe('owner');
    });

    it('should throw when tenantId is missing', () => {
      expect(() =>
        builder
          .withId('550e8400-e29b-41d4-a716-446655440030')
          .withUserId(USER_ID)
          .withRole('owner')
          .withCreatedAt(NOW)
          .withUpdatedAt(NOW)
          .build(),
      ).toThrow(FieldIsRequiredException);
    });

    it('should throw when userId is missing', () => {
      expect(() =>
        builder
          .withId('550e8400-e29b-41d4-a716-446655440030')
          .withTenantId(TENANT_ID)
          .withRole('owner')
          .withCreatedAt(NOW)
          .withUpdatedAt(NOW)
          .build(),
      ).toThrow(FieldIsRequiredException);
    });

    it('should throw when role is missing', () => {
      expect(() =>
        builder
          .withId('550e8400-e29b-41d4-a716-446655440030')
          .withTenantId(TENANT_ID)
          .withUserId(USER_ID)
          .withCreatedAt(NOW)
          .withUpdatedAt(NOW)
          .build(),
      ).toThrow(FieldIsRequiredException);
    });
  });

  describe('buildViewModel()', () => {
    it('should build a TenantMembershipViewModel when all required fields are set', () => {
      const viewModel = builder
        .withId('550e8400-e29b-41d4-a716-446655440030')
        .withTenantId(TENANT_ID)
        .withUserId(USER_ID)
        .withRole('owner')
        .withCreatedAt(NOW)
        .withUpdatedAt(NOW)
        .buildViewModel();

      expect(viewModel.role).toBe('owner');
    });

    it('should throw when tenantId is missing', () => {
      expect(() =>
        builder
          .withId('550e8400-e29b-41d4-a716-446655440030')
          .withUserId(USER_ID)
          .withRole('owner')
          .buildViewModel(),
      ).toThrow(FieldIsRequiredException);
    });

    it('should throw when userId is missing', () => {
      expect(() =>
        builder
          .withId('550e8400-e29b-41d4-a716-446655440030')
          .withTenantId(TENANT_ID)
          .withRole('owner')
          .buildViewModel(),
      ).toThrow(FieldIsRequiredException);
    });

    it('should throw when role is missing', () => {
      expect(() =>
        builder
          .withId('550e8400-e29b-41d4-a716-446655440030')
          .withTenantId(TENANT_ID)
          .withUserId(USER_ID)
          .buildViewModel(),
      ).toThrow(FieldIsRequiredException);
    });
  });
});
