import { createE2EApp, E2EContext } from './helpers/app-bootstrap';
import { truncateAll } from './helpers/db-reset';

/**
 * REST coverage for `TenantPermissionGuard` — see
 * `openspec/changes/add-tenancy-rbac/specs/tenancy/rbac/spec.md`. Each
 * tenant-scoped endpoint is exercised with a sufficient-role caller
 * (succeeds), an insufficient-role member (403), and a non-member (403).
 */
describe('Tenancy RBAC — REST (e2e)', () => {
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
   * Builds a tenant with one caller per role (OWNER, ADMIN, MEMBER) plus an
   * authenticated outsider with no membership. Admin/member tokens come
   * from a fresh login performed *after* the membership is granted, so
   * they already carry the right `tenants` claim; the owner's token
   * predates tenant creation and is refreshed explicitly (tenant creation
   * doesn't reissue the caller's existing token — see
   * `tenant-permission.guard.ts` / design.md "stale role" risk).
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

  describe('PATCH /tenants/:tenantId (manage-tenant permission)', () => {
    it('allows the owner to update the tenant', async () => {
      const { tenantId, ownerToken } =
        await buildTenantWithRoles('update-owner');

      const res = await ctx
        .http()
        .patch(`/api/v1/tenants/${tenantId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Renamed Tenant' });

      expect(res.status).toBe(200);
    });

    it('allows an admin to update the tenant', async () => {
      const { tenantId, adminToken } =
        await buildTenantWithRoles('update-admin');

      const res = await ctx
        .http()
        .patch(`/api/v1/tenants/${tenantId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Renamed Tenant' });

      expect(res.status).toBe(200);
    });

    it('rejects a member — MEMBER does not grant manage-tenant', async () => {
      const { tenantId, memberToken } =
        await buildTenantWithRoles('update-member');

      const res = await ctx
        .http()
        .patch(`/api/v1/tenants/${tenantId}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ name: 'Renamed Tenant' });

      expect(res.status).toBe(403);
    });

    it('rejects a caller with no membership in the tenant', async () => {
      const { tenantId, nonMemberToken } =
        await buildTenantWithRoles('update-outsider');

      const res = await ctx
        .http()
        .patch(`/api/v1/tenants/${tenantId}`)
        .set('Authorization', `Bearer ${nonMemberToken}`)
        .send({ name: 'Renamed Tenant' });

      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /tenants/:tenantId (delete-tenant permission)', () => {
    it('allows the owner to delete the tenant', async () => {
      const { tenantId, ownerToken } =
        await buildTenantWithRoles('delete-owner');

      const res = await ctx
        .http()
        .delete(`/api/v1/tenants/${tenantId}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(204);
    });

    it('rejects an admin — delete-tenant is owner-only', async () => {
      const { tenantId, adminToken } =
        await buildTenantWithRoles('delete-admin');

      const res = await ctx
        .http()
        .delete(`/api/v1/tenants/${tenantId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(403);
    });

    it('rejects a caller with no membership in the tenant', async () => {
      const { tenantId, nonMemberToken } =
        await buildTenantWithRoles('delete-outsider');

      const res = await ctx
        .http()
        .delete(`/api/v1/tenants/${tenantId}`)
        .set('Authorization', `Bearer ${nonMemberToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('POST /tenants/:tenantId/members (manage-members permission)', () => {
    it('allows an admin to add a member', async () => {
      const { tenantId, adminToken } =
        await buildTenantWithRoles('addmember-admin');
      const newMemberEmail = uniqueEmail('addmember-new');
      await ctx.http().post('/api/v1/auth/register').send({
        email: newMemberEmail,
        password: PASSWORD,
        displayName: 'New Member',
      });

      const res = await ctx
        .http()
        .post(`/api/v1/tenants/${tenantId}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: newMemberEmail, role: 'MEMBER' });

      expect(res.status).toBe(201);
    });

    it('rejects a member — MEMBER does not grant manage-members', async () => {
      const { tenantId, memberToken } =
        await buildTenantWithRoles('addmember-member');
      const newMemberEmail = uniqueEmail('addmember-blocked');
      await ctx.http().post('/api/v1/auth/register').send({
        email: newMemberEmail,
        password: PASSWORD,
        displayName: 'Blocked',
      });

      const res = await ctx
        .http()
        .post(`/api/v1/tenants/${tenantId}/members`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ email: newMemberEmail, role: 'MEMBER' });

      expect(res.status).toBe(403);
    });

    it('rejects a caller with no membership in the tenant', async () => {
      const { tenantId, nonMemberToken } =
        await buildTenantWithRoles('addmember-outsider');
      const newMemberEmail = uniqueEmail('addmember-outsider-target');
      await ctx.http().post('/api/v1/auth/register').send({
        email: newMemberEmail,
        password: PASSWORD,
        displayName: 'Target',
      });

      const res = await ctx
        .http()
        .post(`/api/v1/tenants/${tenantId}/members`)
        .set('Authorization', `Bearer ${nonMemberToken}`)
        .send({ email: newMemberEmail, role: 'MEMBER' });

      expect(res.status).toBe(403);
    });
  });

  describe('GET /tenants/:tenantId/members (view-tenant permission)', () => {
    it('allows a member to list the tenant members', async () => {
      const { tenantId, memberToken } =
        await buildTenantWithRoles('list-member');

      const res = await ctx
        .http()
        .get(`/api/v1/tenants/${tenantId}/members`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(200);
    });

    it('rejects a caller with no membership in the tenant', async () => {
      const { tenantId, nonMemberToken } =
        await buildTenantWithRoles('list-outsider');

      const res = await ctx
        .http()
        .get(`/api/v1/tenants/${tenantId}/members`)
        .set('Authorization', `Bearer ${nonMemberToken}`);

      expect(res.status).toBe(403);
    });
  });
});
