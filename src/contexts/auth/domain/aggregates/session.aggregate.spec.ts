import { SessionBuilder } from '@contexts/auth/domain/builders/session.builder';
import { UuidValueObject } from '@sisques-labs/nestjs-kit';

import { SessionAggregate } from './session.aggregate';

const SESSION_ID = '650e8400-e29b-41d4-a716-446655440001';
const SUCCESSOR_ID = '650e8400-e29b-41d4-a716-446655440002';
const USER_ID = '550e8400-e29b-41d4-a716-446655440001';
const REFRESH_TOKEN_HASH = 'a'.repeat(64);
const CREATED_AT = new Date('2024-01-01T00:00:00.000Z');
const UPDATED_AT = new Date('2024-01-01T00:00:00.000Z');

const buildSession = (): SessionAggregate =>
  new SessionBuilder()
    .withId(SESSION_ID)
    .withUserId(USER_ID)
    .withRefreshTokenHash(REFRESH_TOKEN_HASH)
    .withExpiresAt(new Date(Date.now() + 1_000_000))
    .withCreatedAt(CREATED_AT)
    .withUpdatedAt(UPDATED_AT)
    .build();

describe('SessionAggregate', () => {
  describe('constructor — hydration', () => {
    it('should construct with matching field values', () => {
      const session = buildSession();

      expect(session.id.value).toBe(SESSION_ID);
      expect(session.userId.value).toBe(USER_ID);
      expect(session.refreshTokenHash.value).toBe(REFRESH_TOKEN_HASH);
    });

    it('should default revokedAt and replacedBySessionId to null when not provided', () => {
      const session = buildSession();

      expect(session.revokedAt).toBeNull();
      expect(session.replacedBySessionId).toBeNull();
      expect(session.isRevoked()).toBe(false);
    });
  });

  describe('isExpired()', () => {
    it('should return true once the expiry timestamp has passed', () => {
      const session = new SessionBuilder()
        .withId(SESSION_ID)
        .withUserId(USER_ID)
        .withRefreshTokenHash(REFRESH_TOKEN_HASH)
        .withExpiresAt(new Date('2024-01-01T00:00:00.000Z'))
        .withCreatedAt(CREATED_AT)
        .withUpdatedAt(UPDATED_AT)
        .build();

      expect(session.isExpired(new Date('2024-01-01T00:00:01.000Z'))).toBe(
        true,
      );
    });

    it('should return false before the expiry timestamp', () => {
      const session = buildSession();

      expect(session.isExpired(new Date('2020-01-01T00:00:00.000Z'))).toBe(
        false,
      );
    });
  });

  describe('revoke()', () => {
    it('should set revokedAt and replacedBySessionId, and mark the session revoked', () => {
      const session = buildSession();
      const successorId = new UuidValueObject(SUCCESSOR_ID);

      session.revoke(successorId);

      expect(session.isRevoked()).toBe(true);
      expect(session.revokedAt).not.toBeNull();
      expect(session.replacedBySessionId?.value).toBe(SUCCESSOR_ID);
    });

    it('should touch updatedAt', () => {
      const session = buildSession();

      session.revoke(new UuidValueObject(SUCCESSOR_ID));

      expect(session.updatedAt.value.getTime()).toBeGreaterThanOrEqual(
        UPDATED_AT.getTime(),
      );
    });
  });

  describe('isRevoked()', () => {
    it('should return false for a fresh session', () => {
      expect(buildSession().isRevoked()).toBe(false);
    });

    it('should return true after revoke()', () => {
      const session = buildSession();
      session.revoke(new UuidValueObject(SUCCESSOR_ID));

      expect(session.isRevoked()).toBe(true);
    });
  });

  describe('markReuseDetected()', () => {
    it('should keep the session revoked and touch updatedAt', () => {
      const session = buildSession();
      session.revoke(new UuidValueObject(SUCCESSOR_ID));
      const revokedAtBeforeReplay = session.revokedAt;

      session.markReuseDetected();

      expect(session.isRevoked()).toBe(true);
      expect(session.revokedAt).toEqual(revokedAtBeforeReplay);
    });
  });

  describe('toPrimitives()', () => {
    it('should serialize revokedAt and replacedBySessionId as null for a fresh session', () => {
      const primitives = buildSession().toPrimitives();

      expect(primitives.revokedAt).toBeNull();
      expect(primitives.replacedBySessionId).toBeNull();
    });

    it('should serialize revokedAt and replacedBySessionId once revoked', () => {
      const session = buildSession();
      session.revoke(new UuidValueObject(SUCCESSOR_ID));

      const primitives = session.toPrimitives();

      expect(primitives.revokedAt).toBeInstanceOf(Date);
      expect(primitives.replacedBySessionId).toBe(SUCCESSOR_ID);
    });
  });
});
