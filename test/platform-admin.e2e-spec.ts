import { createE2EApp, E2EContext } from './helpers/app-bootstrap';
import { truncateAll } from './helpers/db-reset';

/**
 * `PLATFORM_ADMIN_EMAILS` bootstrap: grants `platformAdmin` on login when
 * the authenticating email is in the allowlist, and revokes it on a
 * subsequent login once the email is removed. `authConfig` reads
 * `process.env.PLATFORM_ADMIN_EMAILS` once at module bootstrap, so each
 * phase below spins up its own app instance against the same database to
 * change the effective allowlist between logins.
 */
describe('Platform Admin Bootstrap (e2e)', () => {
  const email = `platform-admin-${Date.now()}-${Math.floor(Math.random() * 100000)}@example.com`;
  const password = 'Sup3rStrongPassw0rd!';

  function decodeAccessTokenPayload(accessToken: string): {
    platformAdmin: boolean;
  } {
    const [, encodedPayload] = accessToken.split('.');
    return JSON.parse(
      Buffer.from(encodedPayload, 'base64url').toString('utf8'),
    ) as { platformAdmin: boolean };
  }

  afterAll(() => {
    delete process.env.PLATFORM_ADMIN_EMAILS;
  });

  it('grants platformAdmin on login, then revokes it after removal from the allowlist', async () => {
    // Phase 1: this user's email IS in PLATFORM_ADMIN_EMAILS.
    process.env.PLATFORM_ADMIN_EMAILS = email;
    let ctx: E2EContext = await createE2EApp();
    await truncateAll(ctx.dataSource);

    const registerRes = await ctx.http().post('/api/v1/auth/register').send({
      email,
      password,
      displayName: 'Platform Admin User',
    });
    expect(registerRes.status).toBe(201);

    const grantLogin = await ctx
      .http()
      .post('/api/v1/auth/login')
      .send({ email, password });
    expect(grantLogin.status).toBe(200);
    expect(
      decodeAccessTokenPayload(grantLogin.body.accessToken as string)
        .platformAdmin,
    ).toBe(true);

    await ctx.close();

    // Phase 2: fresh app instance, this user's email is no longer present.
    process.env.PLATFORM_ADMIN_EMAILS = 'someone-else@example.com';
    ctx = await createE2EApp();

    const revokeLogin = await ctx
      .http()
      .post('/api/v1/auth/login')
      .send({ email, password });
    expect(revokeLogin.status).toBe(200);
    expect(
      decodeAccessTokenPayload(revokeLogin.body.accessToken as string)
        .platformAdmin,
    ).toBe(false);

    await ctx.close();
  }, 60000);
});
