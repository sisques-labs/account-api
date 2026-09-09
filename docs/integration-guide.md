# Integration guide — building an app on Sisques Account

Audience: engineers working on a **consumer app** (`gardenia-api`,
`nexora-api`, or a future one) that wants to delegate identity + tenancy to
this service instead of rolling its own. This is the "how does my app
actually log a user in" doc — for how `account-api` itself is built, see the
root `README.md` and each context's own `README.md`.

Full target design (including the parts not built yet) lives in
`/Users/javi/Documents/projects/sisques-labs/sisques-account-architecture.md`.
This guide only documents what's **actually implemented today** in this
repo, and calls out explicitly where today's shortcuts diverge from that
design.

---

## 1. Register / log in / refresh

Your app never talks to Keycloak. It talks to `account-api`'s REST API:

```
POST /api/v1/auth/register   { email, password, displayName }  -> 201
POST /api/v1/auth/login      { email, password }                -> 200 { accessToken, refreshToken }
POST /api/v1/auth/refresh    { refreshToken }                   -> 200 { accessToken, refreshToken }
```

- `login`/`refresh` responses also set `access_token`/`refresh_token` as
  `httpOnly` cookies (see §3 for why you likely can't rely on that yet).
- `refresh` **rotates** the refresh token — the old one is invalidated the
  moment you call this. There's no reuse-detection grace window (MVP
  simplification, see `src/contexts/auth/README.md`), so don't call it twice
  in parallel with the same token.
- Full multi-step example (register → login → create app/tenant → add
  member → refresh) is in the root `README.md`'s "Example flow" — same API,
  copy-paste-able with `curl`.

## 2. Validating the access token in your own app

This is the part the architecture doc describes as "SSR app validates the
JWT locally with Sisques Account's public key" — **this is now built**.

- The access token is signed **RS256 with an asymmetric key pair**
  (`JWT_PRIVATE_KEY`, see `src/core/config/auth.config.ts` /
  `security.module.ts`). The public key is published, unauthenticated, at
  `GET /.well-known/jwks.json` as a standard JSON Web Key Set — no private
  key material is ever exposed there.
- Practical consequence: your app's backend does **not** need any shared
  secret. Fetch `GET /.well-known/jwks.json` from `account-api`, pick the
  key entry matching the token's `kid` header, and verify with a standard
  JWT library (`jsonwebtoken`, `@nestjs/jwt`, `jose`, etc.), algorithm
  `RS256`.
- **Breaking change from earlier HS256 tokens.** Tokens issued before this
  migration were signed HS256 and cannot be verified by the RS256 path —
  `account-api` does not implement a dual-verification compatibility
  bridge. Any client holding a pre-cutover token must re-authenticate.

### Claims shape (`IAccessTokenClaims`)

```json
{
  "sub": "<userId>",
  "email": "<email>",
  "platformAdmin": false,
  "tenants": [{ "tenantId": "...", "role": "OWNER" }]
}
```

- `tenants` is a snapshot taken at sign time (login/refresh) — creating a
  tenant or being added as a member doesn't retroactively update an
  already-issued token. A client needs to re-login or wait for its next
  refresh to see a new membership.
- `role` is one of `OWNER` / `ADMIN` / `MEMBER` (`TenantRoleEnum`,
  `src/contexts/tenancy/domain/enums/tenant-role.enum.ts`) — a **fixed,
  closed set** `account-api` assigns and stores, but never interprets
  beyond its own platform-level permissions (see §5). What each role
  *means* inside your app (e.g. Gardenia's `MEMBER` can water but not
  delete plants) is entirely your app's own authorization logic —
  `account-api` just carries the label.
- Token TTL is short (`JWT_EXPIRES_IN`, default 15m) by design, so budget
  for the refresh flow (§1) rather than trying to cache a token long-term.

## 3. Two consumption patterns (per the design) — status today

The architecture doc describes two patterns for how a consumer app plugs
in. Neither is exercised end-to-end yet because there's no consumer app or
`account-web` wired up — the notes below are what you'd need to build to
follow each one, not something you can drop in as-is.

**Pattern A — app with its own backend (SSR).** Read the `access_token`
cookie on each request, verify it locally (§2), attach the resulting claims
to the request. This works **only if** your app's backend and
`account-api` share a cookie domain (`Domain=.sisqueslabs.com` in
production) — `COOKIE_DOMAIN` is unset by default in this repo's
`.env.example` and no app currently sets it, so the cookie today only ever
round-trips to the same host it was issued from. Until that's turned on
end-to-end, use the `Authorization: Bearer` header (from the JSON body
instead of the cookie) — the same `JwtAuthGuard` pattern this repo uses
internally (`src/core/security/guards/jwt-auth.guard.ts`) reads only the
header, not the cookie, for exactly this reason.

**Pattern B — SPA + its own API.** The design calls for
`GET login.sisqueslabs.com/api/token` (`credentials: include`) so
browser JS can pull the JWT out of the httpOnly cookie via a same-site
request, then forward it as `Authorization: Bearer` to your own API. **This
endpoint does not exist in `account-api` yet.** Until it's added, a
browser-side client has no way to get the JWT out of an httpOnly cookie —
you'd need to call `/auth/login` yourself and hold the token client-side
(losing the httpOnly XSS protection), or wait for this endpoint.

**The redirect-to-`login.sisqueslabs.com` login page** (`account-web`)
also doesn't exist yet — it's explicitly out of MVP scope (see root
README). Until then, "logging a user in" from your app means calling
`/auth/login` directly (server-to-server or from your own login form),
not redirecting to a Sisques Account–hosted page.

## 5. Authorization in your app: your own policy, on a shared mechanism

`account-api`'s `tenancy` context ships **layer 1 only** — the mechanics of
who belongs to a tenant and with which of the three fixed roles (`OWNER`,
`ADMIN`, `MEMBER`). What a role should be allowed to *do* (layer 2) is
inherently app-specific, so `account-api` never ships a permission enum or
a role→permission mapping for your app to import. **Every consumer app
defines its own permission model.**

The plumbing that *reads* that model — resolving the caller's tenant
membership from the JWT claim, comparing it against a map, rejecting with
403 — is common enough that it's not worth rewriting per app. As of
`@sisques-labs/nestjs-kit@1.9.0`, that mechanism ships as
`@sisques-labs/nestjs-kit/rbac` (`createTenantPermissionGuard()` +
`RequiresTenantPermission()`) — extracted from this repo's own
`TenantPermissionGuard`/`@RequiresPermission()`
(`src/contexts/tenancy/infrastructure/{guards,decorators}/`), which now
builds on that same factory instead of a hand-rolled guard. **Your app
should do the same, not re-implement the guard from scratch.**

Concretely, for a new app (say `gardenia-api`), that means:

1. **Your own permission enum**, named for your domain — not a copy of
   `account-api`'s `TenantPermissionEnum`:

   ```typescript
   // gardenia-api/src/contexts/garden/domain/enums/garden-permission.enum.ts
   export enum GardenPermissionEnum {
     VIEW_PLANTS = 'VIEW_PLANTS',
     WATER_PLANT = 'WATER_PLANT',
     DELETE_PLANT = 'DELETE_PLANT',
     INVITE_GARDENER = 'INVITE_GARDENER',
   }
   ```

2. **Your own `TenantRoleEnum -> GardenPermissionEnum[]` map.** You reuse
   `account-api`'s three role labels (they're the only ones that will ever
   appear in the `tenants` claim) but decide freely what each one unlocks
   in your domain — it does not have to mirror `account-api`'s own
   `TENANT_ROLE_PERMISSIONS` mapping at all:

   ```typescript
   export const GARDEN_ROLE_PERMISSIONS: Record<string, GardenPermissionEnum[]> = {
     OWNER:  [VIEW_PLANTS, WATER_PLANT, DELETE_PLANT, INVITE_GARDENER],
     ADMIN:  [VIEW_PLANTS, WATER_PLANT, INVITE_GARDENER], // no delete
     MEMBER: [VIEW_PLANTS, WATER_PLANT],                  // no invite, no delete
   };
   ```

3. **Your own guard + decorator, built from the kit's factory** — not a
   hand-rolled `CanActivate` class. It runs after your own `JwtAuthGuard`
   (§2) and reads the caller's role for the target tenant straight off
   `request.user.tenants` — no call back to `account-api` needed:

   ```typescript
   import {
     createTenantPermissionGuard,
     RequiresTenantPermission,
   } from '@sisques-labs/nestjs-kit/rbac';

   export const GardenPermissionGuard = createTenantPermissionGuard({
     rolePermissions: GARDEN_ROLE_PERMISSIONS,
     // Optional — defaults to account-api's own convention (REST `:tenantId`
     // param, GraphQL top-level `tenantId`/`input.tenantId` arg). Override
     // when your route param is named differently, e.g. `gardenId`:
     // resolveTenantId: (context) => context.switchToHttp().getRequest().params.gardenId,
   });

   export const RequiresGardenPermission = RequiresTenantPermission<GardenPermission>;
   ```

4. **Wire it per endpoint**, same as `TenantsController` does today:

   ```typescript
   @Delete(':gardenId/plants/:plantId')
   @UseGuards(JwtAuthGuard, GardenPermissionGuard)
   @RequiresGardenPermission(GardenPermissionEnum.DELETE_PLANT)
   async deletePlant(...) { ... }
   ```

   See `@sisques-labs/nestjs-kit`'s README ("RBAC (Tenant Permissions)") for
   the full reference on what the factory does and its options.

**Things this implies:**

- The `tenantId` in the claim is a neutral UUID that `account-api` treats as
  "a tenant" — your app is free to treat that same UUID as "a garden", "a
  workspace", or whatever your domain calls it. There's no separate
  per-app tenant id to manage.
- You cannot introduce a fourth role (e.g. `"GARDENER_PRO"`) — the
  `tenants` claim only ever carries `OWNER`/`ADMIN`/`MEMBER`, because
  `account-api` is the only service that manages membership and mints the
  token. If your app needs finer-grained per-user flags beyond those three
  roles, model that as your own data (e.g. a `garden_member` extra-flags
  table), not as a new tenant role.
- Guard enforcement is **per-endpoint, not automatic** — same caveat as
  `account-api`'s own `tenancy/README.md`: adding a new tenant-scoped route
  later means adding `@UseGuards()`/`@RequiresGardenPermission()` to it
  yourself, in your app.
- Same staleness caveat as §2: a role change takes effect for a caller only
  after their next login/refresh, since the guard reads the JWT, not a DB
  row, on every request.

## 6. Summary — what you can rely on today vs. not

| Capability | Status |
|---|---|
| Register / login / refresh via REST | ✅ Implemented (`/api/v1/auth/*`) |
| `Authorization: Bearer` validation in your own backend | ✅ Works — fetch the public key from `GET /.well-known/jwks.json`, no shared secret needed (see §2) |
| Tenant creation / membership (capa 1 tenancy) | ✅ Implemented (`/api/v1/tenants*`, `/api/v1/apps*` — see root README example) |
| Tenant-permission guard mechanism (`@sisques-labs/nestjs-kit/rbac`) | ✅ Implemented (v1.9.0+) — bring your own permission enum + role map, the guard/decorator are shared (see §5) |
| Shared-cookie SSO across `*.sisqueslabs.com` (Pattern A) | ❌ Not wired up (`COOKIE_DOMAIN` unset, untested end-to-end) |
| `GET /api/token` for SPA clients (Pattern B) | ❌ Not built |
| Hosted login page (`account-web`) + redirect flow | ❌ Not built (out of MVP scope) |
| Asymmetric signing (RS256) + JWKS endpoint | ✅ Implemented (`GET /.well-known/jwks.json`) |
| Email-based tenant invites | ❌ Not built (out of MVP scope) |
