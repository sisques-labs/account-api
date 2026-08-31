import { UserBuilder } from '@contexts/identity/domain/builders/user.builder';
import { UserRegisteredEvent } from '@contexts/identity/domain/events/user-registered/user-registered.event';

import { UserAggregate } from './user.aggregate';

const USER_ID = '550e8400-e29b-41d4-a716-446655440001';
const EXTERNAL_ID = '9f9ff0ba-dc3d-484d-853a-64a0faeeff5e';
const EMAIL = 'user@example.com';
const DISPLAY_NAME = 'Test User';
const CREATED_AT = new Date('2024-01-01T00:00:00.000Z');
const UPDATED_AT = new Date('2024-01-01T00:00:00.000Z');

const buildUser = (): UserAggregate =>
  new UserBuilder()
    .withId(USER_ID)
    .withExternalId(EXTERNAL_ID)
    .withEmail(EMAIL)
    .withDisplayName(DISPLAY_NAME)
    .withCreatedAt(CREATED_AT)
    .withUpdatedAt(UPDATED_AT)
    .build();

describe('UserAggregate', () => {
  describe('constructor — hydration', () => {
    it('should construct with matching field values', () => {
      const user = buildUser();

      expect(user.id.value).toBe(USER_ID);
      expect(user.externalId.value).toBe(EXTERNAL_ID);
      expect(user.email.value).toBe(EMAIL);
      expect(user.displayName.value).toBe(DISPLAY_NAME);
      expect(user.platformAdmin.value).toBe(false);
      expect(user.refreshTokenHash).toBeNull();
    });

    it('should have no uncommitted events after construction', () => {
      expect(buildUser().getUncommittedEvents()).toHaveLength(0);
    });
  });

  describe('create()', () => {
    it('should emit a UserRegisteredEvent with correct metadata and data', () => {
      const user = buildUser();
      user.create();
      const events = user.getUncommittedEvents();

      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(UserRegisteredEvent);
      const event = events[0] as UserRegisteredEvent;
      expect(event.aggregateRootId).toBe(USER_ID);
      expect(event.data).toEqual({
        id: USER_ID,
        externalId: EXTERNAL_ID,
        email: EMAIL,
        displayName: DISPLAY_NAME,
      });
    });
  });

  describe('issueRefreshToken()', () => {
    it('should set refreshTokenHash and refreshTokenExpiresAt', () => {
      const user = buildUser();
      const hash = 'a'.repeat(64);
      const expiresAt = new Date('2024-02-01T00:00:00.000Z');

      user.issueRefreshToken(hash, expiresAt);

      expect(user.refreshTokenHash?.value).toBe(hash);
      expect(user.refreshTokenExpiresAt?.value).toEqual(expiresAt);
    });
  });

  describe('revokeRefreshToken()', () => {
    it('should clear refreshTokenHash and refreshTokenExpiresAt', () => {
      const user = buildUser();
      user.issueRefreshToken('a'.repeat(64), new Date('2024-02-01'));

      user.revokeRefreshToken();

      expect(user.refreshTokenHash).toBeNull();
      expect(user.refreshTokenExpiresAt).toBeNull();
    });
  });

  describe('isRefreshTokenExpired()', () => {
    it('should return true when no refresh token has been issued', () => {
      expect(buildUser().isRefreshTokenExpired()).toBe(true);
    });

    it('should return false when the refresh token has not expired', () => {
      const user = buildUser();
      const future = new Date(Date.now() + 60_000);
      user.issueRefreshToken('a'.repeat(64), future);

      expect(user.isRefreshTokenExpired(new Date())).toBe(false);
    });

    it('should return true when the refresh token has expired', () => {
      const user = buildUser();
      const past = new Date(Date.now() - 60_000);
      user.issueRefreshToken('a'.repeat(64), past);

      expect(user.isRefreshTokenExpired(new Date())).toBe(true);
    });
  });

  describe('toPrimitives()', () => {
    it('should serialize all fields, including null refresh token fields', () => {
      const user = buildUser();

      expect(user.toPrimitives()).toEqual({
        id: USER_ID,
        externalId: EXTERNAL_ID,
        email: EMAIL,
        displayName: DISPLAY_NAME,
        platformAdmin: false,
        refreshTokenHash: null,
        refreshTokenExpiresAt: null,
        createdAt: CREATED_AT,
        updatedAt: UPDATED_AT,
      });
    });
  });
});
