import { AuthModule } from '../../src/contexts/auth/auth.module';
import { SessionBuilder } from '../../src/contexts/auth/domain/builders/session.builder';
import {
  ISessionWriteRepository,
  SESSION_WRITE_REPOSITORY,
} from '../../src/contexts/auth/domain/repositories/write/session-write.repository';
import { UserBuilder } from '../../src/contexts/user/domain/builders/user.builder';
import {
  IUserWriteRepository,
  USER_WRITE_REPOSITORY,
} from '../../src/contexts/user/domain/repositories/write/user-write.repository';
import { UserModule } from '../../src/contexts/user/user.module';
import { truncateAll } from '../helpers/db-reset';
import {
  createIntegrationModule,
  IntegrationContext,
} from '../helpers/integration-bootstrap';

describe('Session repository (integration)', () => {
  let ctx: IntegrationContext;
  let sessionWriteRepo: ISessionWriteRepository;
  let userWriteRepo: IUserWriteRepository;
  let sessionBuilder: SessionBuilder;
  let userBuilder: UserBuilder;

  const USER_ID = '550e8400-e29b-41d4-a716-446655440001';

  beforeAll(async () => {
    ctx = await createIntegrationModule({ imports: [UserModule, AuthModule] });
    sessionWriteRepo = ctx.module.get(SESSION_WRITE_REPOSITORY);
    userWriteRepo = ctx.module.get(USER_WRITE_REPOSITORY);
    sessionBuilder = ctx.module.get(SessionBuilder);
    userBuilder = ctx.module.get(UserBuilder);
  });

  afterAll(async () => {
    await ctx.close();
  });

  beforeEach(async () => {
    await truncateAll(ctx.dataSource);

    const now = new Date();
    await userWriteRepo.save(
      userBuilder
        .withId(USER_ID)
        .withExternalId('kc-sub-1')
        .withEmail('user@example.com')
        .withDisplayName('Test User')
        .withCreatedAt(now)
        .withUpdatedAt(now)
        .build(),
    );
  });

  const buildSession = (
    overrides: Partial<{ id: string; refreshTokenHash: string }> = {},
  ) => {
    const now = new Date();
    return (
      sessionBuilder
        .withId(overrides.id ?? '650e8400-e29b-41d4-a716-446655440001')
        .withUserId(USER_ID)
        .withRefreshTokenHash(overrides.refreshTokenHash ?? 'a'.repeat(64))
        .withExpiresAt(new Date(Date.now() + 1_000_000))
        // sessionBuilder is a shared singleton — always reset these two
        // explicitly, or a prior test's revoked build leaks its non-null
        // replacedBySessionId into this "fresh" one and trips the self-FK.
        .withRevokedAt(null)
        .withReplacedBySessionId(null)
        .withCreatedAt(now)
        .withUpdatedAt(now)
        .build()
    );
  };

  it('should save a session and find it by refresh token hash', async () => {
    const hash = 'b'.repeat(64);
    await sessionWriteRepo.save(buildSession({ refreshTokenHash: hash }));

    const found = await sessionWriteRepo.findByRefreshTokenHash(hash);

    expect(found).not.toBeNull();
    expect(found?.userId.value).toBe(USER_ID);
  });

  it('should find a session by userId', async () => {
    await sessionWriteRepo.save(buildSession());

    const found = await sessionWriteRepo.findByUserId(USER_ID);

    expect(found).not.toBeNull();
  });

  it('should allow more than one session per user (UQ_session_user_id dropped by the chain migration)', async () => {
    await sessionWriteRepo.save(
      buildSession({
        id: '650e8400-e29b-41d4-a716-446655440001',
        refreshTokenHash: 'c'.repeat(64),
      }),
    );

    await expect(
      sessionWriteRepo.save(
        buildSession({
          id: '650e8400-e29b-41d4-a716-446655440002',
          refreshTokenHash: 'd'.repeat(64),
        }),
      ),
    ).resolves.not.toThrow();
  });

  it('should cascade-delete the session when the user is deleted', async () => {
    await sessionWriteRepo.save(buildSession());
    await userWriteRepo.delete(USER_ID);

    const found = await sessionWriteRepo.findByUserId(USER_ID);

    expect(found).toBeNull();
  });

  describe('rotate()', () => {
    it('should insert the successor and revoke the predecessor with a chain link', async () => {
      const presentedHash = 'e'.repeat(64);
      await sessionWriteRepo.save(
        buildSession({
          id: '650e8400-e29b-41d4-a716-446655440010',
          refreshTokenHash: presentedHash,
        }),
      );

      const successorId = '650e8400-e29b-41d4-a716-446655440011';
      const result = await sessionWriteRepo.rotate(
        presentedHash,
        async (current) => {
          const now = new Date();
          const created = sessionBuilder
            .withId(successorId)
            .withUserId(USER_ID)
            .withRefreshTokenHash('f'.repeat(64))
            .withExpiresAt(new Date(Date.now() + 1_000_000))
            .withRevokedAt(null)
            .withReplacedBySessionId(null)
            .withCreatedAt(now)
            .withUpdatedAt(now)
            .build();

          current.revoke(created.id);

          return { revoked: current, created };
        },
      );

      expect(result).not.toBeNull();
      expect(result?.created.id.value).toBe(successorId);
      expect(result?.revoked.isRevoked()).toBe(true);
      expect(result?.revoked.replacedBySessionId?.value).toBe(successorId);

      const successor = await sessionWriteRepo.findByRefreshTokenHash(
        'f'.repeat(64),
      );
      expect(successor).not.toBeNull();

      const predecessor =
        await sessionWriteRepo.findByRefreshTokenHash(presentedHash);
      expect(predecessor?.isRevoked()).toBe(true);
      expect(predecessor?.replacedBySessionId?.value).toBe(successorId);
    });

    it('should return null when no session matches the presented hash', async () => {
      const result = await sessionWriteRepo.rotate(
        '5'.repeat(64),
        async (current) => ({ revoked: current, created: current }),
      );

      expect(result).toBeNull();
    });

    it('should let exactly one of two concurrent rotations on the same token succeed', async () => {
      const presentedHash = '6'.repeat(64);
      await sessionWriteRepo.save(
        buildSession({
          id: '650e8400-e29b-41d4-a716-446655440020',
          refreshTokenHash: presentedHash,
        }),
      );

      let rotationsRun = 0;
      const rotateOnce = (successorId: string, successorHash: string) =>
        sessionWriteRepo.rotate(presentedHash, async (current) => {
          rotationsRun += 1;
          if (current.isRevoked()) {
            throw new Error('token already consumed');
          }

          const now = new Date();
          const created = sessionBuilder
            .withId(successorId)
            .withUserId(USER_ID)
            .withRefreshTokenHash(successorHash)
            .withExpiresAt(new Date(Date.now() + 1_000_000))
            .withRevokedAt(null)
            .withReplacedBySessionId(null)
            .withCreatedAt(now)
            .withUpdatedAt(now)
            .build();

          current.revoke(created.id);

          return { revoked: current, created };
        });

      const results = await Promise.allSettled([
        rotateOnce('650e8400-e29b-41d4-a716-446655440021', '1'.repeat(64)),
        rotateOnce('650e8400-e29b-41d4-a716-446655440022', '2'.repeat(64)),
      ]);

      expect(rotationsRun).toBe(2);
      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');
      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);
    });
  });

  describe('reuse detection (replay of a consumed token invalidates the whole chain)', () => {
    it('should revoke every session in the chain when a consumed token is replayed, so a still-unused successor also becomes unusable', async () => {
      const rootHash = '7'.repeat(64);
      const middleHash = '8'.repeat(64);
      const leafHash = '9'.repeat(64);

      await sessionWriteRepo.save(
        buildSession({
          id: '650e8400-e29b-41d4-a716-446655440040',
          refreshTokenHash: rootHash,
        }),
      );

      // Rotate root -> middle (simulates a normal refresh).
      await sessionWriteRepo.rotate(rootHash, async (current) => {
        const now = new Date();
        const created = sessionBuilder
          .withId('650e8400-e29b-41d4-a716-446655440041')
          .withUserId(USER_ID)
          .withRefreshTokenHash(middleHash)
          .withExpiresAt(new Date(Date.now() + 1_000_000))
          .withRevokedAt(null)
          .withReplacedBySessionId(null)
          .withCreatedAt(now)
          .withUpdatedAt(now)
          .build();
        current.revoke(created.id);
        return { revoked: current, created };
      });

      // Rotate middle -> leaf (the legitimate holder's latest, never-used token).
      await sessionWriteRepo.rotate(middleHash, async (current) => {
        const now = new Date();
        const created = sessionBuilder
          .withId('650e8400-e29b-41d4-a716-446655440042')
          .withUserId(USER_ID)
          .withRefreshTokenHash(leafHash)
          .withExpiresAt(new Date(Date.now() + 1_000_000))
          .withRevokedAt(null)
          .withReplacedBySessionId(null)
          .withCreatedAt(now)
          .withUpdatedAt(now)
          .build();
        current.revoke(created.id);
        return { revoked: current, created };
      });

      // Replay the already-consumed root token — reuse detected.
      let reuseDetected = false;
      await expect(
        sessionWriteRepo.rotate(rootHash, async (current) => {
          if (current.isRevoked()) {
            reuseDetected = true;
            current.markReuseDetected();
            await sessionWriteRepo.revokeAllByUserId(current.userId.value);
            throw new Error('reuse detected');
          }
          return { revoked: current, created: current };
        }),
      ).rejects.toThrow('reuse detected');

      expect(reuseDetected).toBe(true);

      const leaf = await sessionWriteRepo.findByRefreshTokenHash(leafHash);
      expect(leaf?.isRevoked()).toBe(true);

      const middle = await sessionWriteRepo.findByRefreshTokenHash(middleHash);
      expect(middle?.isRevoked()).toBe(true);
    });
  });

  describe('revokeAllByUserId()', () => {
    it('should revoke every non-revoked session for the user', async () => {
      await sessionWriteRepo.save(
        buildSession({
          id: '650e8400-e29b-41d4-a716-446655440030',
          refreshTokenHash: '3'.repeat(64),
        }),
      );
      await sessionWriteRepo.save(
        buildSession({
          id: '650e8400-e29b-41d4-a716-446655440031',
          refreshTokenHash: '4'.repeat(64),
        }),
      );

      await sessionWriteRepo.revokeAllByUserId(USER_ID);

      const first = await sessionWriteRepo.findByRefreshTokenHash(
        '3'.repeat(64),
      );
      const second = await sessionWriteRepo.findByRefreshTokenHash(
        '4'.repeat(64),
      );
      expect(first?.isRevoked()).toBe(true);
      expect(second?.isRevoked()).toBe(true);
    });
  });
});
