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
    return sessionBuilder
      .withId(overrides.id ?? '650e8400-e29b-41d4-a716-446655440001')
      .withUserId(USER_ID)
      .withRefreshTokenHash(overrides.refreshTokenHash ?? 'a'.repeat(64))
      .withExpiresAt(new Date(Date.now() + 1_000_000))
      .withCreatedAt(now)
      .withUpdatedAt(now)
      .build();
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

  it('should enforce one session per user at the database level', async () => {
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
    ).rejects.toThrow();
  });

  it('should cascade-delete the session when the user is deleted', async () => {
    await sessionWriteRepo.save(buildSession());
    await userWriteRepo.delete(USER_ID);

    const found = await sessionWriteRepo.findByUserId(USER_ID);

    expect(found).toBeNull();
  });
});
