import { AppBuilder } from '../../src/contexts/tenancy/domain/builders/app.builder';
import { TenantBuilder } from '../../src/contexts/tenancy/domain/builders/tenant.builder';
import { TenantMembershipBuilder } from '../../src/contexts/tenancy/domain/builders/tenant-membership.builder';
import { APP_WRITE_REPOSITORY } from '../../src/contexts/tenancy/domain/repositories/write/app-write.repository';
import { IAppWriteRepository } from '../../src/contexts/tenancy/domain/repositories/write/app-write.repository';
import { TENANT_WRITE_REPOSITORY } from '../../src/contexts/tenancy/domain/repositories/write/tenant-write.repository';
import { ITenantWriteRepository } from '../../src/contexts/tenancy/domain/repositories/write/tenant-write.repository';
import { TENANT_MEMBERSHIP_WRITE_REPOSITORY } from '../../src/contexts/tenancy/domain/repositories/write/tenant-membership-write.repository';
import { ITenantMembershipWriteRepository } from '../../src/contexts/tenancy/domain/repositories/write/tenant-membership-write.repository';
import { TENANT_MEMBERSHIP_READ_REPOSITORY } from '../../src/contexts/tenancy/domain/repositories/read/tenant-membership-read.repository';
import { ITenantMembershipReadRepository } from '../../src/contexts/tenancy/domain/repositories/read/tenant-membership-read.repository';
import { UserBuilder } from '../../src/contexts/identity/domain/builders/user.builder';
import { USER_WRITE_REPOSITORY } from '../../src/contexts/identity/domain/repositories/write/user-write.repository';
import { IUserWriteRepository } from '../../src/contexts/identity/domain/repositories/write/user-write.repository';
import { IdentityModule } from '../../src/contexts/identity/identity.module';
import { TenancyModule } from '../../src/contexts/tenancy/tenancy.module';
import { truncateAll } from '../helpers/db-reset';
import {
  createIntegrationModule,
  IntegrationContext,
} from '../helpers/integration-bootstrap';

describe('Tenancy repositories (integration)', () => {
  let ctx: IntegrationContext;
  let appWriteRepo: IAppWriteRepository;
  let tenantWriteRepo: ITenantWriteRepository;
  let membershipWriteRepo: ITenantMembershipWriteRepository;
  let membershipReadRepo: ITenantMembershipReadRepository;
  let userWriteRepo: IUserWriteRepository;
  let appBuilder: AppBuilder;
  let tenantBuilder: TenantBuilder;
  let membershipBuilder: TenantMembershipBuilder;
  let userBuilder: UserBuilder;

  const APP_ID = '550e8400-e29b-41d4-a716-446655440010';
  const TENANT_ID = '550e8400-e29b-41d4-a716-446655440020';
  // `tenant_membership.user_id` has a real FK to `user` — same physical DB,
  // so membership tests must seed a matching user row first.
  const USER_ID = '550e8400-e29b-41d4-a716-446655440000';

  beforeAll(async () => {
    ctx = await createIntegrationModule({
      imports: [IdentityModule, TenancyModule],
    });
    appWriteRepo = ctx.module.get(APP_WRITE_REPOSITORY);
    tenantWriteRepo = ctx.module.get(TENANT_WRITE_REPOSITORY);
    membershipWriteRepo = ctx.module.get(TENANT_MEMBERSHIP_WRITE_REPOSITORY);
    membershipReadRepo = ctx.module.get(TENANT_MEMBERSHIP_READ_REPOSITORY);
    userWriteRepo = ctx.module.get(USER_WRITE_REPOSITORY);
    appBuilder = ctx.module.get(AppBuilder);
    tenantBuilder = ctx.module.get(TenantBuilder);
    membershipBuilder = ctx.module.get(TenantMembershipBuilder);
    userBuilder = ctx.module.get(UserBuilder);
  });

  afterAll(async () => {
    await ctx.close();
  });

  beforeEach(async () => {
    await truncateAll(ctx.dataSource);
  });

  const seedUser = async () => {
    const now = new Date();
    const user = userBuilder
      .withId(USER_ID)
      .withExternalId('kc-sub-owner')
      .withEmail('owner@example.com')
      .withDisplayName('Owner')
      .withCreatedAt(now)
      .withUpdatedAt(now)
      .build();
    await userWriteRepo.save(user);
    return user;
  };

  const seedApp = async () => {
    const now = new Date();
    const app = appBuilder
      .withId(APP_ID)
      .withSlug('gardenia')
      .withName('Gardenia')
      .withCreatedAt(now)
      .withUpdatedAt(now)
      .build();
    await appWriteRepo.save(app);
    return app;
  };

  const seedTenant = async () => {
    const now = new Date();
    const tenant = tenantBuilder
      .withId(TENANT_ID)
      .withAppId(APP_ID)
      .withName('My Garden')
      .withSlug('my-garden')
      .withCreatedAt(now)
      .withUpdatedAt(now)
      .build();
    await tenantWriteRepo.save(tenant);
    return tenant;
  };

  describe('App', () => {
    it('should save and find an app by id', async () => {
      await seedApp();

      const found = await appWriteRepo.findById(APP_ID);

      expect(found).not.toBeNull();
      expect(found?.slug.value).toBe('gardenia');
    });

    it('should find an app by slug', async () => {
      await seedApp();

      const found = await appWriteRepo.findBySlug('gardenia');

      expect(found).not.toBeNull();
    });

    it('should enforce slug uniqueness', async () => {
      await seedApp();

      const now = new Date();
      const duplicate = appBuilder
        .withId('550e8400-e29b-41d4-a716-446655440011')
        .withSlug('gardenia')
        .withName('Gardenia Clone')
        .withCreatedAt(now)
        .withUpdatedAt(now)
        .build();

      await expect(appWriteRepo.save(duplicate)).rejects.toThrow();
    });
  });

  describe('Tenant', () => {
    it('should save and find a tenant by appId+slug', async () => {
      await seedApp();
      await seedTenant();

      const found = await tenantWriteRepo.findByAppIdAndSlug(
        APP_ID,
        'my-garden',
      );

      expect(found).not.toBeNull();
      expect(found?.name.value).toBe('My Garden');
    });

    it('should allow the same slug across different apps', async () => {
      await seedApp();
      await seedTenant();

      const now = new Date();
      const otherApp = appBuilder
        .withId('550e8400-e29b-41d4-a716-446655440012')
        .withSlug('nexora')
        .withName('Nexora')
        .withCreatedAt(now)
        .withUpdatedAt(now)
        .build();
      await appWriteRepo.save(otherApp);

      const otherTenant = tenantBuilder
        .withId('550e8400-e29b-41d4-a716-446655440021')
        .withAppId(otherApp.id.value)
        .withName('My Garden')
        .withSlug('my-garden')
        .withCreatedAt(now)
        .withUpdatedAt(now)
        .build();

      await expect(tenantWriteRepo.save(otherTenant)).resolves.toBeDefined();
    });
  });

  describe('TenantMembership', () => {
    it('should save and find a membership by tenantId+userId', async () => {
      await seedApp();
      await seedTenant();
      await seedUser();
      const now = new Date();
      const membership = membershipBuilder
        .withId('550e8400-e29b-41d4-a716-446655440030')
        .withTenantId(TENANT_ID)
        .withUserId(USER_ID)
        .withRole('owner')
        .withCreatedAt(now)
        .withUpdatedAt(now)
        .build();

      await membershipWriteRepo.save(membership);

      const found = await membershipWriteRepo.findByTenantIdAndUserId(
        TENANT_ID,
        USER_ID,
      );

      expect(found).not.toBeNull();
      expect(found?.role.value).toBe('owner');
    });

    it('should enforce one membership per tenant+user', async () => {
      await seedApp();
      await seedTenant();
      await seedUser();
      const now = new Date();
      await membershipWriteRepo.save(
        membershipBuilder
          .withId('550e8400-e29b-41d4-a716-446655440031')
          .withTenantId(TENANT_ID)
          .withUserId(USER_ID)
          .withRole('owner')
          .withCreatedAt(now)
          .withUpdatedAt(now)
          .build(),
      );

      const duplicate = membershipBuilder
        .withId('550e8400-e29b-41d4-a716-446655440032')
        .withTenantId(TENANT_ID)
        .withUserId(USER_ID)
        .withRole('member')
        .withCreatedAt(now)
        .withUpdatedAt(now)
        .build();

      await expect(membershipWriteRepo.save(duplicate)).rejects.toThrow();
    });

    it('should list all members of a tenant via the read repository', async () => {
      await seedApp();
      await seedTenant();
      await seedUser();
      const now = new Date();
      await membershipWriteRepo.save(
        membershipBuilder
          .withId('550e8400-e29b-41d4-a716-446655440033')
          .withTenantId(TENANT_ID)
          .withUserId(USER_ID)
          .withRole('owner')
          .withCreatedAt(now)
          .withUpdatedAt(now)
          .build(),
      );

      const members = await membershipReadRepo.findAllByTenantId(TENANT_ID);

      expect(members).toHaveLength(1);
      expect(members[0].role).toBe('owner');
    });

    it('should list all memberships of a user via the read repository', async () => {
      await seedApp();
      await seedTenant();
      await seedUser();
      const now = new Date();
      await membershipWriteRepo.save(
        membershipBuilder
          .withId('550e8400-e29b-41d4-a716-446655440034')
          .withTenantId(TENANT_ID)
          .withUserId(USER_ID)
          .withRole('owner')
          .withCreatedAt(now)
          .withUpdatedAt(now)
          .build(),
      );

      const memberships = await membershipReadRepo.findAllByUserId(USER_ID);

      expect(memberships).toHaveLength(1);
      expect(memberships[0].tenantId).toBe(TENANT_ID);
    });
  });
});
