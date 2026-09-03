# Auth Context

## What this context owns

`auth` is the **security boundary** of Sisques Account. It owns:

- **Registration/login/refresh orchestration** — the full flow, including
  driving creation of the local `user` row (see "How registration works").
- **The Keycloak adapter** — the ONE identity-provider implementation for
  the MVP. Password hashing, brute-force protection, and (eventually) MFA
  and email verification are Keycloak's job, not this context's — see the
  architecture doc's "Proveedor de identidad" section for why that's
  delegated rather than built.
- **JWT issuance** — Sisques Account signs its OWN access token (never a
  Keycloak-issued one).
- **Sessions** — the opaque refresh token, as its own `SessionAggregate`
  (see below), one per user.

What it does **not** own: the user's profile fields (`email`, `displayName`,
`platformAdmin`) — that's the `user` context. It also doesn't own tenants,
memberships, or roles — that's the `tenancy` context. See `user`'s README
for the full "one context, or two, or three?" reasoning behind this split.

---

## Core aggregate

### `SessionAggregate`

| Field | Type | Notes |
|-------|------|-------|
| `id` | `UuidValueObject` | |
| `userId` | `UuidValueObject` | FK to `user.id` — deliberately the generic nestjs-kit VO, not `user`'s `UserIdValueObject` (cross-context domain imports are only legal from `infrastructure/adapters/`) |
| `refreshTokenHash` | `RefreshTokenHashValueObject` | SHA-256 hex of the current opaque refresh token |
| `expiresAt` | `DateValueObject` | |

Methods: `rotate(hash, expiresAt)`, `isExpired(now?)`. No domain events —
nothing consumes a session-issued event.

**MVP simplification — single active session per user.** The architecture
doc's schema section lists only 4 tables (`app`, `user`, `tenant`,
`tenant_membership`) — no session table. This context adds a 5th
(`session`, `UNIQUE(user_id)`) rather than storing the refresh token
directly on `user`, but keeps the same MVP behavior: a new login or refresh
**rotates the existing row in place** instead of creating a second one, so
only the most recent session stays valid. A real multi-device session model
(reuse detection, per-device revocation — see `gardenia-api`'s
`contexts/auth` for what that looks like) is the natural next step post-MVP
if multi-device support is needed; the table already being separate from
`user` is what makes that a schema change local to `auth` when the time
comes.

---

## How registration works

`auth` owns the whole flow — it calls Keycloak *and* drives creation of the
local `user` row, rather than `user` owning registration and delegating
only the Keycloak call to `auth`. This keeps `auth` symmetric with
login/refresh (it's the single entry point for everything
authentication-related) and keeps the pre-check-before-external-call
ordering that avoids orphaning a Keycloak identity in one place.

```
POST /auth/register  ->  AuthController
                      ->  RegisterUserCommand
                      ->  RegisterUserCommandHandler
                          1. IUserLookupPort.findByEmail()
                             -> 409 (EmailAlreadyRegisteredException) if
                                already taken — checked BEFORE calling
                                Keycloak, so a local conflict never leaves
                                an orphaned Keycloak identity behind
                          2. IIdentityProviderPort.registerIdentity()
                             -> KeycloakIdentityProviderAdapter creates the
                                user via Keycloak's Admin REST API, returns
                                the new `sub` as externalId
                          3. IUserProvisioningPort.createUser()
                             -> dispatches CreateUserCommand into `user`
                                (via CommandBus) — creates the local row
```

`IUserProvisioningPort`'s `UserProvisioningAdapter` is the first
command-dispatching cross-context adapter in this codebase (every other
cross-context adapter so far only dispatches queries) — still within the
same boundary rule, just exercising the command half of it.

## How login works

```
POST /auth/login  ->  LoginUserCommandHandler
                       1. IIdentityProviderPort.verifyCredentials()
                          -> KeycloakIdentityProviderAdapter does a
                             `grant_type=password` call against Keycloak's
                             token endpoint; a non-2xx response means
                             invalid credentials
                       2. IUserLookupPort.findByEmail() — local user lookup
                       3. ITenantMembershipLookupPort.findMembershipsByUserId()
                          -> tenant/role claims for the JWT
                       4. TokenSignService.execute({sub, email, platformAdmin, tenants})
                       5. Generate + hash a new opaque refresh token; find
                          any existing SessionAggregate for this userId and
                          rotate it, or create a new one
                       6. Return { accessToken, refreshToken } (JSON body +
                          cookies — see root README)
```

## How refresh works

```
POST /auth/refresh  ->  RefreshSessionCommandHandler
                         1. Hash the presented raw token
                         2. ISessionWriteRepository.findByRefreshTokenHash()
                            (401 if none)
                         3. 401 + delete the session if expired
                         4. IUserLookupPort.findById(session.userId) — the
                            session only has a userId, not an email, which
                            is why this find-by-id path exists
                         5. Same claims-sign + rotate-token steps as login
```

Rotation is unconditional — presenting an already-rotated (or never-issued)
token always 401s, since the MVP has no reuse-detection grace window (that's
gardenia's more sophisticated, explicitly-superseded design — see the
architecture doc).

---

## JWT payload (`IAccessTokenClaims`, `src/core/security/`)

```json
{
  "sub": "<userId>",
  "email": "<email>",
  "platformAdmin": false,
  "tenants": [{ "tenantId": "...", "role": "owner" }]
}
```

Claims are a snapshot at sign time — creating a tenant or being added as a
member doesn't retroactively update an already-issued access token; the
change shows up on the next login/refresh (minutes, by design — see the
architecture doc's rationale for short-lived tokens + refresh over a
call-on-every-request model).

---

## Cross-context ports

| Port | Adapter | Dispatches | Used by |
|------|---------|-----------|---------|
| `IIdentityProviderPort` (`registerIdentity` / `verifyCredentials`) | `KeycloakIdentityProviderAdapter` | HTTP calls to Keycloak's Admin API + token endpoint — the only external I/O in this context | register, login |
| `ITenantMembershipLookupPort` (`findMembershipsByUserId`) | `TenantMembershipLookupAdapter` | `TenantMembershipFindByUserIdQuery` (tenancy, via `QueryBus`) | login, refresh (JWT claims) |
| `IUserLookupPort` (`findByEmail` / `findById`) | `UserLookupAdapter` | `UserFindByEmailQuery` / `UserFindByIdQuery` (user, via `QueryBus`) | register (pre-check), login, refresh |
| `IUserProvisioningPort` (`createUser`) | `UserProvisioningAdapter` | `CreateUserCommand` (user, via `CommandBus`) | register |

`IIdentityProviderPort` is shaped so a second adapter (e.g. Cognito) could
implement it later without touching `application`/`domain` — but per YAGNI,
no second adapter is built now.

> Boundary rule: cross-context imports are allowed **only** from
> `infrastructure/adapters/`. `src/core/security/` (`JwtAuthGuard`,
> `@CurrentUser()`, `JwtService`) is cross-cutting infra, not owned by this
> context — every context that needs it depends on it directly, which is
> fine (it isn't `@contexts/*`).

---

## Public API

### REST (`/api/v1/auth/*`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/v1/auth/register` | — | Create the user in Keycloak + locally. 201, or 409 if the email is taken. |
| `POST` | `/api/v1/auth/login` | — | Verify credentials, issue tokens. 200 `{ accessToken, refreshToken }`, or 401. |
| `POST` | `/api/v1/auth/refresh` | — (refresh token in body) | Rotate the refresh token, issue a new access token. 200, or 401. |

### Commands

| Class | Description |
|-------|-------------|
| `RegisterUserCommand` | Registers with Keycloak, then provisions the local user (cross-context) |
| `LoginUserCommand` | Verifies credentials, issues a session |
| `RefreshSessionCommand` | Rotates the refresh token |

---

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `JWT_SECRET` | `dev-insecure-secret-change-me` | Signs access tokens — set a real secret outside local dev |
| `JWT_EXPIRES_IN` | `15m` | Access token TTL |
| `REFRESH_TOKEN_TTL_DAYS` | `30` | Opaque refresh token TTL |
| `COOKIE_DOMAIN` | unset | `.sisqueslabs.com` in production once apps share the domain |
| `KEYCLOAK_BASE_URL` | `http://localhost:8084` | Shared Keycloak instance from `local-dev-stack` |
| `KEYCLOAK_REALM` | `sisques-account` | |
| `KEYCLOAK_CLIENT_ID` | `account-api` | Confidential client, service account + direct grants |
| `KEYCLOAK_CLIENT_SECRET` | `local-dev-secret-change-me` | |

## Testing

```bash
pnpm test src/contexts/auth            # unit
pnpm test:integration                  # session repository, real Postgres
pnpm test:e2e                          # full register/login/refresh flow, real Keycloak
```

Unit tests mock `IIdentityProviderPort`/`ITenantMembershipLookupPort`/
`IUserLookupPort`/`IUserProvisioningPort` and every repository — no network
or DB needed. `KeycloakIdentityProviderAdapter` itself is unit-tested with a
mocked `global.fetch`. Real Keycloak is only exercised at the e2e layer (see
root README "Running tests").

TypeORM mappers/repositories are intentionally **not** unit-tested in
isolation (mocking a TypeORM `Repository` is low-value) — they're covered by
`test/integration/session.repository.integration-spec.ts` against real
Postgres instead (see `package.json`'s `collectCoverageFrom` exclusions for
this layer).
