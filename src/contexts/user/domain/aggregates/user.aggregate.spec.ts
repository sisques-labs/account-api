import { UserBuilder } from '@contexts/user/domain/builders/user.builder';
import { UserRegisteredEvent } from '@contexts/user/domain/events/user-registered/user-registered.event';

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
      expect(user.displayName?.value).toBe(DISPLAY_NAME);
      expect(user.platformAdmin.value).toBe(false);
    });

    it('should have no uncommitted events after construction', () => {
      expect(buildUser().getUncommittedEvents()).toHaveLength(0);
    });

    it('should leave displayName undefined when not provided', () => {
      const user = new UserBuilder()
        .withId(USER_ID)
        .withExternalId(EXTERNAL_ID)
        .withEmail(EMAIL)
        .withCreatedAt(CREATED_AT)
        .withUpdatedAt(UPDATED_AT)
        .build();

      expect(user.displayName).toBeUndefined();
      expect(user.toPrimitives().displayName).toBeNull();
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
        platformAdmin: false,
        createdAt: CREATED_AT,
        updatedAt: UPDATED_AT,
      });
    });
  });

  describe('toPrimitives()', () => {
    it('should serialize all fields', () => {
      const user = buildUser();

      expect(user.toPrimitives()).toEqual({
        id: USER_ID,
        externalId: EXTERNAL_ID,
        email: EMAIL,
        displayName: DISPLAY_NAME,
        platformAdmin: false,
        createdAt: CREATED_AT,
        updatedAt: UPDATED_AT,
      });
    });
  });
});
