import { createE2EApp, E2EContext } from './helpers/app-bootstrap';
import { truncateAll } from './helpers/db-reset';
import { gql } from './helpers/graphql-client';

/**
 * GraphQL mirror of `tenancy-rbac.e2e-spec.ts` for the four
 * `TenantPermissionGuard`-protected operations — see
 * `openspec/changes/add-tenancy-rbac/specs/tenancy/rbac/spec.md`. Fixture
 * setup goes through REST (same as `app-tenancy-graphql.e2e-spec.ts`);
 * only the operation under test is exercised over GraphQL.
 */
describe('Tenancy RBAC — GraphQL (e2e)', () => {
  let ctx: E2EContext;

  beforeAll(async () => {
    ctx = await createE2EApp();
  }, 60000);

  afterAll(async () => {
    await ctx.close();
  });

  beforeEach(async () => {
    await truncateAll(ctx.dataSource);
  });

  const PASSWORD = 'Sup3rStrongPassw0rd!';

  const uniqueEmail = (prefix: string) =>
    `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}@example.com`;

  const registerAndLogin = async (
    prefix: string,
  ): Promise<{ accessToken: string; refreshToken: string }> => {
    const email = uniqueEmail(prefix);
    await ctx.http().post('/api/v1/auth/register').send({
      email,
      password: PASSWORD,
      displayName: prefix,
    });
    const login = await ctx
      .http()
      .post('/api/v1/auth/login')
      .send({ email, password: PASSWORD });

    return {
      accessToken: login.body.accessToken as string,
      refreshToken: login.body.refreshToken as string,
    };
  };

  interface TenantRbacFixture {
    tenantId: string;
    /** Refreshed — reflects the OWNER membership tenant creation grants. */
    ownerToken: string;
    adminToken: string;
    memberToken: string;
    /** Authenticated, but no membership in this tenant. */
    nonMemberToken: string;
  }

  /**
   * Same fixture shape as `tenancy-rbac.e2e-spec.ts` — built over REST
   * since it's the simplest path to a tenant with one caller per role.
   * The owner's token is refreshed after tenant creation because creating
   * a tenant doesn't reissue the caller's existing access token (see
   * `tenant-permission.guard.ts` / design.md "stale role" risk); admin and
   * member tokens come from a fresh login performed after their membership
   * is granted, so no explicit refresh is needed for them.
   */
  const buildTenantWithRoles = async (
    prefix: string,
  ): Promise<TenantRbacFixture> => {
    const owner = await registerAndLogin(`${prefix}-owner`);

    const appRes = await ctx
      .http()
      .post('/api/v1/apps')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ slug: `${prefix}-app-${Date.now()}`, name: 'App' });

    const tenantRes = await ctx
      .http()
      .post('/api/v1/tenants')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ appId: appRes.text, name: 'Tenant' });
    const tenantId = tenantRes.text as string;

    const ownerRefresh = await ctx
      .http()
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: owner.refreshToken });
    const ownerToken = ownerRefresh.body.accessToken as string;

    const adminEmail = uniqueEmail(`${prefix}-admin`);
    await ctx.http().post('/api/v1/auth/register').send({
      email: adminEmail,
      password: PASSWORD,
      displayName: 'Admin',
    });
    await ctx
      .http()
      .post(`/api/v1/tenants/${tenantId}/members`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ email: adminEmail, role: 'ADMIN' });
    const adminLogin = await ctx
      .http()
      .post('/api/v1/auth/login')
      .send({ email: adminEmail, password: PASSWORD });
    const adminToken = adminLogin.body.accessToken as string;

    const memberEmail = uniqueEmail(`${prefix}-member`);
    await ctx.http().post('/api/v1/auth/register').send({
      email: memberEmail,
      password: PASSWORD,
      displayName: 'Member',
    });
    await ctx
      .http()
      .post(`/api/v1/tenants/${tenantId}/members`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ email: memberEmail, role: 'MEMBER' });
    const memberLogin = await ctx
      .http()
      .post('/api/v1/auth/login')
      .send({ email: memberEmail, password: PASSWORD });
    const memberToken = memberLogin.body.accessToken as string;

    const outsider = await registerAndLogin(`${prefix}-outsider`);

    return {
      tenantId,
      ownerToken,
      adminToken,
      memberToken,
      nonMemberToken: outsider.accessToken,
    };
  };

  describe('mutation tenantUpdate (manage-tenant permission)', () => {
    it('allows the owner to update the tenant', async () => {
      const { tenantId, ownerToken } =
        await buildTenantWithRoles('gql-update-owner');

      const res = await gql(
        ctx.app,
        `mutation UpdateTenant($input: TenantUpdateRequestDto!) {
          tenantUpdate(input: $input) { success }
        }`,
        { input: { tenantId, name: 'Renamed Tenant' } },
      ).set('Authorization', `Bearer ${ownerToken}`);

      expect(res.body.errors).toBeUndefined();
      expect(res.body.data.tenantUpdate.success).toBe(true);
    });

    it('allows an admin to update the tenant', async () => {
      const { tenantId, adminToken } =
        await buildTenantWithRoles('gql-update-admin');

      const res = await gql(
        ctx.app,
        `mutation UpdateTenant($input: TenantUpdateRequestDto!) {
          tenantUpdate(input: $input) { success }
        }`,
        { input: { tenantId, name: 'Renamed Tenant' } },
      ).set('Authorization', `Bearer ${adminToken}`);

      expect(res.body.errors).toBeUndefined();
      expect(res.body.data.tenantUpdate.success).toBe(true);
    });

    it('rejects a member — MEMBER does not grant manage-tenant', async () => {
      const { tenantId, memberToken } =
        await buildTenantWithRoles('gql-update-member');

      const res = await gql(
        ctx.app,
        `mutation UpdateTenant($input: TenantUpdateRequestDto!) {
          tenantUpdate(input: $input) { success }
        }`,
        { input: { tenantId, name: 'Renamed Tenant' } },
      ).set('Authorization', `Bearer ${memberToken}`);

      expect(res.body.errors?.[0]?.message).toBeDefined();
      expect(res.body.data?.tenantUpdate).toBeUndefined();
    });

    it('rejects a caller with no membership in the tenant', async () => {
      const { tenantId, nonMemberToken } = await buildTenantWithRoles(
        'gql-update-outsider',
      );

      const res = await gql(
        ctx.app,
        `mutation UpdateTenant($input: TenantUpdateRequestDto!) {
          tenantUpdate(input: $input) { success }
        }`,
        { input: { tenantId, name: 'Renamed Tenant' } },
      ).set('Authorization', `Bearer ${nonMemberToken}`);

      expect(res.body.errors?.[0]?.message).toBeDefined();
    });
  });

  describe('mutation tenantDelete (delete-tenant permission)', () => {
    it('allows the owner to delete the tenant', async () => {
      const { tenantId, ownerToken } =
        await buildTenantWithRoles('gql-delete-owner');

      const res = await gql(
        ctx.app,
        `mutation DeleteTenant($input: TenantDeleteRequestDto!) {
          tenantDelete(input: $input) { success }
        }`,
        { input: { tenantId } },
      ).set('Authorization', `Bearer ${ownerToken}`);

      expect(res.body.errors).toBeUndefined();
      expect(res.body.data.tenantDelete.success).toBe(true);
    });

    it('rejects an admin — delete-tenant is owner-only', async () => {
      const { tenantId, adminToken } =
        await buildTenantWithRoles('gql-delete-admin');

      const res = await gql(
        ctx.app,
        `mutation DeleteTenant($input: TenantDeleteRequestDto!) {
          tenantDelete(input: $input) { success }
        }`,
        { input: { tenantId } },
      ).set('Authorization', `Bearer ${adminToken}`);

      expect(res.body.errors?.[0]?.message).toBeDefined();
    });

    it('rejects a caller with no membership in the tenant', async () => {
      const { tenantId, nonMemberToken } = await buildTenantWithRoles(
        'gql-delete-outsider',
      );

      const res = await gql(
        ctx.app,
        `mutation DeleteTenant($input: TenantDeleteRequestDto!) {
          tenantDelete(input: $input) { success }
        }`,
        { input: { tenantId } },
      ).set('Authorization', `Bearer ${nonMemberToken}`);

      expect(res.body.errors?.[0]?.message).toBeDefined();
    });
  });

  describe('mutation tenantMemberAdd (manage-members permission)', () => {
    it('allows an admin to add a member', async () => {
      const { tenantId, adminToken } = await buildTenantWithRoles(
        'gql-addmember-admin',
      );
      const newMemberEmail = uniqueEmail('gql-addmember-new');
      await ctx.http().post('/api/v1/auth/register').send({
        email: newMemberEmail,
        password: PASSWORD,
        displayName: 'New Member',
      });

      const res = await gql(
        ctx.app,
        `mutation AddMember($input: TenantAddMemberRequestDto!) {
          tenantMemberAdd(input: $input) { success }
        }`,
        { input: { tenantId, email: newMemberEmail, role: 'MEMBER' } },
      ).set('Authorization', `Bearer ${adminToken}`);

      expect(res.body.errors).toBeUndefined();
      expect(res.body.data.tenantMemberAdd.success).toBe(true);
    });

    it('rejects a member — MEMBER does not grant manage-members', async () => {
      const { tenantId, memberToken } = await buildTenantWithRoles(
        'gql-addmember-member',
      );
      const newMemberEmail = uniqueEmail('gql-addmember-blocked');
      await ctx.http().post('/api/v1/auth/register').send({
        email: newMemberEmail,
        password: PASSWORD,
        displayName: 'Blocked',
      });

      const res = await gql(
        ctx.app,
        `mutation AddMember($input: TenantAddMemberRequestDto!) {
          tenantMemberAdd(input: $input) { success }
        }`,
        { input: { tenantId, email: newMemberEmail, role: 'MEMBER' } },
      ).set('Authorization', `Bearer ${memberToken}`);

      expect(res.body.errors?.[0]?.message).toBeDefined();
    });

    it('rejects a caller with no membership in the tenant', async () => {
      const { tenantId, nonMemberToken } = await buildTenantWithRoles(
        'gql-addmember-outsider',
      );
      const newMemberEmail = uniqueEmail('gql-addmember-outsider-target');
      await ctx.http().post('/api/v1/auth/register').send({
        email: newMemberEmail,
        password: PASSWORD,
        displayName: 'Target',
      });

      const res = await gql(
        ctx.app,
        `mutation AddMember($input: TenantAddMemberRequestDto!) {
          tenantMemberAdd(input: $input) { success }
        }`,
        { input: { tenantId, email: newMemberEmail, role: 'MEMBER' } },
      ).set('Authorization', `Bearer ${nonMemberToken}`);

      expect(res.body.errors?.[0]?.message).toBeDefined();
    });
  });

  describe('query tenantMembershipsFindByTenantId (view-tenant permission)', () => {
    it('allows a member to list the tenant members', async () => {
      const { tenantId, memberToken } =
        await buildTenantWithRoles('gql-list-member');

      const res = await gql(
        ctx.app,
        `query Members($input: TenantMembershipFindByTenantIdRequestDto!) {
          tenantMembershipsFindByTenantId(input: $input) { userId role }
        }`,
        { input: { tenantId } },
      ).set('Authorization', `Bearer ${memberToken}`);

      expect(res.body.errors).toBeUndefined();
      expect(Array.isArray(res.body.data.tenantMembershipsFindByTenantId)).toBe(
        true,
      );
    });

    it('rejects a caller with no membership in the tenant', async () => {
      const { tenantId, nonMemberToken } =
        await buildTenantWithRoles('gql-list-outsider');

      const res = await gql(
        ctx.app,
        `query Members($input: TenantMembershipFindByTenantIdRequestDto!) {
          tenantMembershipsFindByTenantId(input: $input) { userId role }
        }`,
        { input: { tenantId } },
      ).set('Authorization', `Bearer ${nonMemberToken}`);

      expect(res.body.errors?.[0]?.message).toBeDefined();
    });
  });
});
