import { UserBuilder } from '../../src/contexts/identity/domain/builders/user.builder';
import { USER_READ_REPOSITORY } from '../../src/contexts/identity/domain/repositories/read/user-read.repository';
import { IUserReadRepository } from '../../src/contexts/identity/domain/repositories/read/user-read.repository';
import { USER_WRITE_REPOSITORY } from '../../src/contexts/identity/domain/repositories/write/user-write.repository';
import { IUserWriteRepository } from '../../src/contexts/identity/domain/repositories/write/user-write.repository';
import { IdentityModule } from '../../src/contexts/identity/identity.module';
import { truncateAll } from '../helpers/db-reset';
import {
  createIntegrationModule,
  IntegrationContext,
} from '../helpers/integration-bootstrap';

describe('User repository (integration)', () => {
  let ctx: IntegrationContext;
  let writeRepo: IUserWriteRepository;
  let readRepo: IUserReadRepository;
  let userBuilder: UserBuilder;

  beforeAll(async () => {
    ctx = await createIntegrationModule({ imports: [IdentityModule] });
    writeRepo = ctx.module.get(USER_WRITE_REPOSITORY);
    readRepo = ctx.module.get(USER_READ_REPOSITORY);
    userBuilder = ctx.module.get(UserBuilder);
  });

  afterAll(async () => {
    await ctx.close();
  });

  beforeEach(async () => {
    await truncateAll(ctx.dataSource);
  });

  const buildUser = (
    overrides: Partial<{
      id: string;
      externalId: string;
      email: string;
      displayName: string;
    }> = {},
  ) => {
    const now = new Date();
    return userBuilder
      .withId(overrides.id ?? '550e8400-e29b-41d4-a716-446655440001')
      .withExternalId(overrides.externalId ?? 'kc-sub-1')
      .withEmail(overrides.email ?? 'user@example.com')
      .withDisplayName(overrides.displayName ?? 'Test User')
      .withCreatedAt(now)
      .withUpdatedAt(now)
      .build();
  };

  it('should save a user and find it by id via the write repository', async () => {
    const user = buildUser();
    await writeRepo.save(user);

    const found = await writeRepo.findById(user.id.value);

    expect(found).not.toBeNull();
    expect(found?.email.value).toBe('user@example.com');
    expect(found?.externalId.value).toBe('kc-sub-1');
  });

  it('should find a user by email', async () => {
    await writeRepo.save(buildUser({ email: 'findme@example.com' }));

    const found = await writeRepo.findByEmail('findme@example.com');

    expect(found).not.toBeNull();
  });

  it('should return null when no user matches the email', async () => {
    const found = await writeRepo.findByEmail('nobody@example.com');

    expect(found).toBeNull();
  });

  it('should find a user by externalId', async () => {
    await writeRepo.save(buildUser({ externalId: 'kc-sub-unique' }));

    const found = await writeRepo.findByExternalId('kc-sub-unique');

    expect(found).not.toBeNull();
  });

  it('should enforce email uniqueness at the database level', async () => {
    await writeRepo.save(
      buildUser({
        id: '550e8400-e29b-41d4-a716-446655440002',
        email: 'dup@example.com',
        externalId: 'kc-sub-a',
      }),
    );

    await expect(
      writeRepo.save(
        buildUser({
          id: '550e8400-e29b-41d4-a716-446655440003',
          email: 'dup@example.com',
          externalId: 'kc-sub-b',
        }),
      ),
    ).rejects.toThrow();
  });

  it('should find a user by refresh token hash after issuing one', async () => {
    const user = buildUser({ id: '550e8400-e29b-41d4-a716-446655440004' });
    const hash = 'a'.repeat(64);
    user.issueRefreshToken(hash, new Date(Date.now() + 1_000_000));
    await writeRepo.save(user);

    const found = await writeRepo.findByRefreshTokenHash(hash);

    expect(found).not.toBeNull();
    expect(found?.id.value).toBe(user.id.value);
  });

  it('should read a saved user via the read repository', async () => {
    const user = buildUser({ id: '550e8400-e29b-41d4-a716-446655440005' });
    await writeRepo.save(user);

    const viewModel = await readRepo.findById(user.id.value);

    expect(viewModel).not.toBeNull();
    expect(viewModel?.email).toBe('user@example.com');
  });

  it('should find a view model by email via the read repository', async () => {
    await writeRepo.save(
      buildUser({
        id: '550e8400-e29b-41d4-a716-446655440006',
        email: 'readside@example.com',
      }),
    );

    const viewModel = await readRepo.findByEmail('readside@example.com');

    expect(viewModel).not.toBeNull();
  });
});
