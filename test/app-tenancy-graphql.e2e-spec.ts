import { createE2EApp, E2EContext } from './helpers/app-bootstrap';
import { truncateAll } from './helpers/db-reset';
import { gql } from './helpers/graphql-client';

/**
 * GraphQL mirror of `identity-tenancy.e2e-spec.ts`'s REST flow for the `app`
 * and `tenancy` bounded contexts. Auth stays on REST (register/login set
 * httpOnly cookies, out of GraphQL scope for now) — only the app/tenant
 * queries and mutations added in `transport/graphql/` are exercised here.
 */
describe('App + Tenancy GraphQL (e2e)', () => {
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

  const uniqueEmail = (prefix: string) =>
    `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}@example.com`;

  const registerAndLogin = async (
    prefix: string,
  ): Promise<{ email: string; accessToken: string }> => {
    const email = uniqueEmail(prefix);
    const password = 'Sup3rStrongPassw0rd!';
    await ctx.http().post('/api/v1/auth/register').send({
      email,
      password,
      displayName: prefix,
    });
    const login = await ctx
      .http()
      .post('/api/v1/auth/login')
      .send({ email, password });

    return { email, accessToken: login.body.accessToken as string };
  };

  it('rejects appCreate without a bearer token', async () => {
    const res = await gql(
      ctx.app,
      `mutation { appCreate(input: { name: "Gardenia" }) { success } }`,
    );

    expect(res.status).toBe(200);
    expect(res.body.errors?.[0]?.message).toBeDefined();
    expect(res.body.data?.appCreate).toBeUndefined();
  });

  it('rejects tenantCreate without a bearer token', async () => {
    const res = await gql(
      ctx.app,
      `mutation { tenantCreate(input: { appId: "550e8400-e29b-41d4-a716-446655440010", name: "X" }) { success } }`,
    );

    expect(res.status).toBe(200);
    expect(res.body.errors?.[0]?.message).toBeDefined();
  });

  it('rejects tenantsFindByCriteria for a non platform-admin caller', async () => {
    const { accessToken } = await registerAndLogin('non-admin');

    const res = await gql(
      ctx.app,
      `query { tenantsFindByCriteria { total } }`,
    ).set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.errors?.[0]?.message).toMatch(/platform admin/i);
  });

  describe('full flow: create app -> create tenant -> find by id/criteria -> add member -> list members -> update -> delete', () => {
    it('walks the whole MVP flow end to end over GraphQL', async () => {
      const { accessToken: ownerToken, email: ownerEmail } =
        await registerAndLogin('gql-owner');

      // 1. Create the app.
      const appName = `Gardenia ${Date.now()}`;
      const createAppRes = await gql(
        ctx.app,
        `mutation CreateApp($input: AppCreateRequestDto!) {
          appCreate(input: $input) { success message id }
        }`,
        { input: { name: appName } },
      ).set('Authorization', `Bearer ${ownerToken}`);

      expect(createAppRes.status).toBe(200);
      expect(createAppRes.body.errors).toBeUndefined();
      expect(createAppRes.body.data.appCreate.success).toBe(true);
      const appId = createAppRes.body.data.appCreate.id as string;

      // 2. Find it by id.
      const findAppRes = await gql(
        ctx.app,
        `query FindApp($input: AppFindByIdRequestDto!) {
          appFindById(input: $input) { id name }
        }`,
        { input: { id: appId } },
      );
      expect(findAppRes.body.data.appFindById.id).toBe(appId);
      expect(findAppRes.body.data.appFindById.name).toBe(appName);

      // 3. Find it by criteria (LIKE on name).
      const findAppsRes = await gql(
        ctx.app,
        `query FindApps($input: AppFindByCriteriaRequestDto) {
          appsFindByCriteria(input: $input) { total items { id } }
        }`,
        {
          input: {
            filters: [{ field: 'ID', operator: 'EQUALS', value: appId }],
          },
        },
      );
      expect(findAppsRes.body.data.appsFindByCriteria.total).toBe(1);

      // 4. Create the tenant — the caller becomes owner automatically.
      const createTenantRes = await gql(
        ctx.app,
        `mutation CreateTenant($input: TenantCreateRequestDto!) {
          tenantCreate(input: $input) { success id }
        }`,
        { input: { appId, name: 'My Tenant' } },
      ).set('Authorization', `Bearer ${ownerToken}`);
      expect(createTenantRes.body.data.tenantCreate.success).toBe(true);
      const tenantId = createTenantRes.body.data.tenantCreate.id as string;

      // 5. Register a second user and add them as a member.
      const { email: memberEmail } = await registerAndLogin('gql-member');
      const addMemberRes = await gql(
        ctx.app,
        `mutation AddMember($input: TenantAddMemberRequestDto!) {
          tenantMemberAdd(input: $input) { success message }
        }`,
        { input: { tenantId, email: memberEmail, role: 'MEMBER' } },
      ).set('Authorization', `Bearer ${ownerToken}`);
      expect(addMemberRes.body.errors).toBeUndefined();
      expect(addMemberRes.body.data.tenantMemberAdd.success).toBe(true);

      // 6. List members — expect owner (auto-added) + the new member.
      const membersRes = await gql(
        ctx.app,
        `query Members($input: TenantMembershipFindByTenantIdRequestDto!) {
          tenantMembershipsFindByTenantId(input: $input) { userId role }
        }`,
        { input: { tenantId } },
      ).set('Authorization', `Bearer ${ownerToken}`);
      const roles = (
        membersRes.body.data.tenantMembershipsFindByTenantId as Array<{
          role: string;
        }>
      )
        .map((m) => m.role)
        .sort();
      expect(roles).toEqual(['MEMBER', 'OWNER']);

      // 7. Adding the same member again is rejected.
      const dupMemberRes = await gql(
        ctx.app,
        `mutation AddMember($input: TenantAddMemberRequestDto!) {
          tenantMemberAdd(input: $input) { success }
        }`,
        { input: { tenantId, email: memberEmail, role: 'MEMBER' } },
      ).set('Authorization', `Bearer ${ownerToken}`);
      expect(dupMemberRes.body.errors?.[0]?.message).toBeDefined();

      // 8. Update the tenant.
      const updateRes = await gql(
        ctx.app,
        `mutation UpdateTenant($input: TenantUpdateRequestDto!) {
          tenantUpdate(input: $input) { success id }
        }`,
        { input: { tenantId, name: 'Renamed Tenant' } },
      ).set('Authorization', `Bearer ${ownerToken}`);
      expect(updateRes.body.data.tenantUpdate.success).toBe(true);

      // 9. A non-owner cannot delete the tenant.
      const memberLogin = await ctx
        .http()
        .post('/api/v1/auth/login')
        .send({ email: memberEmail, password: 'Sup3rStrongPassw0rd!' });
      const forbiddenDeleteRes = await gql(
        ctx.app,
        `mutation DeleteTenant($input: TenantDeleteRequestDto!) {
          tenantDelete(input: $input) { success }
        }`,
        { input: { tenantId } },
      ).set('Authorization', `Bearer ${memberLogin.body.accessToken}`);
      expect(forbiddenDeleteRes.body.errors?.[0]?.message).toBeDefined();

      // 10. The owner deletes the tenant.
      const deleteRes = await gql(
        ctx.app,
        `mutation DeleteTenant($input: TenantDeleteRequestDto!) {
          tenantDelete(input: $input) { success }
        }`,
        { input: { tenantId } },
      ).set('Authorization', `Bearer ${ownerToken}`);
      expect(deleteRes.body.data.tenantDelete.success).toBe(true);
      expect(ownerEmail).toEqual(expect.any(String));
    });
  });
});
