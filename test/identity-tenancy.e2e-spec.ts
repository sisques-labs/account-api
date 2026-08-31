import { createE2EApp, E2EContext } from './helpers/app-bootstrap';
import { truncateAll } from './helpers/db-reset';

/**
 * Full MVP flow: register -> login -> create app -> create tenant (creator
 * becomes owner) -> register a second user -> add them as a tenant member ->
 * list members -> refresh the session. Requires docker-compose.test.yml's
 * postgres-test AND keycloak-test (register/login hit the real Keycloak
 * adapter) — see README "Running tests".
 */
describe('Identity + Tenancy (e2e)', () => {
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

  it('should register a new user', async () => {
    const res = await ctx
      .http()
      .post('/api/v1/auth/register')
      .send({
        email: uniqueEmail('register'),
        password: 'Sup3rStrongPassw0rd!',
        displayName: 'New User',
      });

    // POST /auth/register returns the bare userId string (not wrapped in
    // JSON), so Nest sends it as text/html — assert on `.text`, not `.body`.
    expect(res.status).toBe(201);
    expect(res.text).toMatch(/^[0-9a-f-]{36}$/i);
  });

  it('should reject registering the same email twice', async () => {
    const email = uniqueEmail('dup');
    const payload = {
      email,
      password: 'Sup3rStrongPassw0rd!',
      displayName: 'Dup User',
    };

    const first = await ctx.http().post('/api/v1/auth/register').send(payload);
    expect(first.status).toBe(201);

    const second = await ctx.http().post('/api/v1/auth/register').send(payload);
    expect(second.status).toBe(409);
  });

  it('should log in and receive access + refresh tokens in the response body', async () => {
    const email = uniqueEmail('login');
    const password = 'Sup3rStrongPassw0rd!';
    await ctx.http().post('/api/v1/auth/register').send({
      email,
      password,
      displayName: 'Login User',
    });

    const res = await ctx.http().post('/api/v1/auth/login').send({
      email,
      password,
    });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toEqual(expect.any(String));
    expect(res.body.refreshToken).toEqual(expect.any(String));
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('should reject login with the wrong password', async () => {
    const email = uniqueEmail('badpw');
    await ctx.http().post('/api/v1/auth/register').send({
      email,
      password: 'Sup3rStrongPassw0rd!',
      displayName: 'Bad Password User',
    });

    const res = await ctx
      .http()
      .post('/api/v1/auth/login')
      .send({ email, password: 'wrong-password' });

    expect(res.status).toBe(401);
  });

  it('should reject an unauthenticated request to create a tenant', async () => {
    const res = await ctx
      .http()
      .post('/api/v1/tenants')
      .send({ appId: '550e8400-e29b-41d4-a716-446655440010', name: 'X' });

    expect(res.status).toBe(401);
  });

  it('should refresh a session and rotate the refresh token', async () => {
    const email = uniqueEmail('refresh');
    const password = 'Sup3rStrongPassw0rd!';
    await ctx.http().post('/api/v1/auth/register').send({
      email,
      password,
      displayName: 'Refresh User',
    });
    const login = await ctx
      .http()
      .post('/api/v1/auth/login')
      .send({ email, password });

    const res = await ctx
      .http()
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: login.body.refreshToken });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toEqual(expect.any(String));
    expect(res.body.refreshToken).not.toBe(login.body.refreshToken);
  });

  it('should reject reusing an already-rotated refresh token', async () => {
    const email = uniqueEmail('reuse');
    const password = 'Sup3rStrongPassw0rd!';
    await ctx.http().post('/api/v1/auth/register').send({
      email,
      password,
      displayName: 'Reuse User',
    });
    const login = await ctx
      .http()
      .post('/api/v1/auth/login')
      .send({ email, password });

    await ctx
      .http()
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: login.body.refreshToken });

    const secondAttempt = await ctx
      .http()
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: login.body.refreshToken });

    expect(secondAttempt.status).toBe(401);
  });

  describe('full flow: register -> login -> create app -> create tenant -> add member -> list members', () => {
    it('walks the whole MVP flow end to end', async () => {
      // 1. Register + login the tenant creator.
      const ownerEmail = uniqueEmail('owner');
      const password = 'Sup3rStrongPassw0rd!';
      await ctx.http().post('/api/v1/auth/register').send({
        email: ownerEmail,
        password,
        displayName: 'Owner User',
      });
      const ownerLogin = await ctx
        .http()
        .post('/api/v1/auth/login')
        .send({ email: ownerEmail, password });
      const ownerToken = ownerLogin.body.accessToken as string;

      // 2. Create the app (bootstrapping plumbing — see AppsController).
      const appSlug = `app-${Date.now()}`;
      const appRes = await ctx
        .http()
        .post('/api/v1/apps')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ slug: appSlug, name: 'Test App' });
      expect(appRes.status).toBe(201);
      const appId = appRes.text;

      // 3. Create the tenant — the caller becomes owner automatically.
      const tenantRes = await ctx
        .http()
        .post('/api/v1/tenants')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ appId, name: 'My Tenant' });
      expect(tenantRes.status).toBe(201);
      const tenantId = tenantRes.text;

      // 4. Register a second user to add as a member.
      const memberEmail = uniqueEmail('member');
      await ctx.http().post('/api/v1/auth/register').send({
        email: memberEmail,
        password,
        displayName: 'Member User',
      });

      // 5. Add them as a member by email.
      const addMemberRes = await ctx
        .http()
        .post(`/api/v1/tenants/${tenantId}/members`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ email: memberEmail, role: 'MEMBER' });
      expect(addMemberRes.status).toBe(201);
      expect(addMemberRes.body.role).toBe('MEMBER');

      // 6. List members — expect the owner (auto-added) + the new member.
      const listRes = await ctx
        .http()
        .get(`/api/v1/tenants/${tenantId}/members`)
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(listRes.status).toBe(200);
      expect(listRes.body).toHaveLength(2);
      const roles = listRes.body.map((m: { role: string }) => m.role).sort();
      expect(roles).toEqual(['MEMBER', 'OWNER']);

      // 7. Adding the same member again is rejected.
      const dupMemberRes = await ctx
        .http()
        .post(`/api/v1/tenants/${tenantId}/members`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ email: memberEmail, role: 'MEMBER' });
      expect(dupMemberRes.status).toBe(409);
    });
  });

  it('should reject adding a member that does not exist', async () => {
    const email = uniqueEmail('creator');
    const password = 'Sup3rStrongPassw0rd!';
    await ctx.http().post('/api/v1/auth/register').send({
      email,
      password,
      displayName: 'Creator',
    });
    const login = await ctx
      .http()
      .post('/api/v1/auth/login')
      .send({ email, password });
    const token = login.body.accessToken as string;

    const appRes = await ctx
      .http()
      .post('/api/v1/apps')
      .set('Authorization', `Bearer ${token}`)
      .send({ slug: `app-${Date.now()}`, name: 'App' });
    const tenantRes = await ctx
      .http()
      .post('/api/v1/tenants')
      .set('Authorization', `Bearer ${token}`)
      .send({ appId: appRes.text, name: 'Tenant' });

    const res = await ctx
      .http()
      .post(`/api/v1/tenants/${tenantRes.text}/members`)
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'does-not-exist@example.com', role: 'MEMBER' });

    expect(res.status).toBe(404);
  });
});
