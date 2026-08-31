# Identity Context

## What this context owns

`identity` is the **security boundary** of Sisques Account. It owns:

- **Users** — the platform identity: `id`, `externalId` (the identity
  provider's subject — Keycloak's `sub` today), `email`, `displayName`,
  `platformAdmin` (unused by any MVP endpoint, but a real column per the
  architecture doc's schema).
- **The Keycloak adapter** — the ONE identity-provider implementation for
  the MVP. Password hashing, brute-force protection, and (eventually) MFA
  and email verification are Keycloak's job, not this context's — see the
  architecture doc's "Proveedor de identidad" section for why that's
  delegated rather than built.
- **JWT issuance** — Sisques Account signs its OWN access token (never a
  Keycloak-issued one) plus an opaque refresh token.

What it does **not** own: tenants, memberships, or roles — that's the
`tenancy` context (layer 1 of the platform's two-layer tenancy model; see
the architecture doc).

---

## One context or two? (identity vs. tenancy)

**Two.** Identity (who you are) and tenancy (which tenants you belong to,
with what role) are different aggregates with different lifecycles and
different consumers:

- A user can exist with zero tenants (just registered, hasn't created or
  joined one yet).
- The architecture doc explicitly frames tenancy as **layer 1**, a platform
  concept fully independent of *how* a user authenticated — Cognito could
  replace Keycloak tomorrow without tenancy caring at all.
- `tenant.app_id` and `tenant_membership` reference *users* by id but have
  no reason to know how identity works internally (Keycloak, password
  policy, refresh-token mechanics) — that's a one-way dependency (tenancy
  needs "does this user exist / what's their id", nothing more), which is
  exactly what the cross-context port/adapter seam is for.
- It mirrors the platform-wide split the architecture doc draws between
  "identidad" and "tenancy capa 1" as two separate concerns from day one,
  rather than merging them now and having to split them later once a second
  identity provider or a richer tenancy feature set arrives.

The two contexts DO depend on each other, but only through ports —
`identity` needs a user's tenant memberships (for JWT claims), `tenancy`
needs to resolve an email to a userId (to add a member). Both directions go
through `application/ports/` + `infrastructure/adapters/` dispatching via
`CommandBus`/`QueryBus`, never a direct domain/application import (enforced
by the `boundaries/element-types` ESLint rule). See "Cross-context ports"
below.

---

## Core aggregate

### `UserAggregate`

| Field | Type | Notes |
|-------|------|-------|
| `id` | `UserIdValueObject` | Platform user id (not the Keycloak sub) |
| `externalId` | `ExternalIdValueObject` | Identity provider's subject id |
| `email` | `UserEmailValueObject` | Unique |
| `displayName` | `DisplayNameValueObject` | |
| `platformAdmin` | `BooleanValueObject` | Default `false`; no MVP endpoint reads/writes it yet |
| `refreshTokenHash` | `RefreshTokenHashValueObject \| null` | SHA-256 hex of the current opaque refresh token, or `null` |
| `refreshTokenExpiresAt` | `DateValueObject \| null` | |

Methods: `create()` (emits `UserRegisteredEvent`), `issueRefreshToken(hash, expiresAt)`,
`revokeRefreshToken()`, `isRefreshTokenExpired(now?)`.

**MVP simplification — single active refresh token per user.** The
architecture doc's schema section lists only 4 tables (`app`, `user`,
`tenant`, `tenant_membership`) — no session/refresh-token table. Rather than
add a 5th table for multi-device session tracking (reuse detection, per-device
revocation — see `gardenia-api`'s `contexts/auth` for what that looks like),
the MVP stores the refresh token hash directly on `user`: a new login or
refresh **overwrites** the previous token, so only the most recent session
stays valid. Good enough to prove the session model end-to-end; a real
session table is the natural next step post-MVP if multi-device support is
needed.

---

## How registration works

```
POST /auth/register  ->  AuthController
                      ->  RegisterUserCommand
                      ->  RegisterUserCommandHandler
                          1. AssertUserEmailAvailableService (409 if taken)
                          2. IIdentityProviderPort.registerIdentity()
                             -> KeycloakIdentityProviderAdapter creates the
                                user via Keycloak's Admin REST API, returns
                                the new `sub` as externalId
                          3. UserBuilder -> user.create() -> save
```

## How login works

```
POST /auth/login  ->  LoginUserCommandHandler
                       1. IIdentityProviderPort.verifyCredentials()
                          -> KeycloakIdentityProviderAdapter does a
                             `grant_type=password` call against Keycloak's
                             token endpoint; a non-2xx response means
                             invalid credentials
                       2. Look up the local user by email
                       3. ITenantMembershipLookupPort.findMembershipsByUserId()
                          -> tenant/role claims for the JWT
                       4. TokenService.sign({sub, email, platformAdmin, tenants})
                       5. Generate + hash a new opaque refresh token,
                          user.issueRefreshToken(), save
                       6. Return { accessToken, refreshToken } (JSON body +
                          cookies — see root README)
```

## How refresh works

```
POST /auth/refresh  ->  RefreshSessionCommandHandler
                         1. Hash the presented raw token
                         2. Find the user by refreshTokenHash (401 if none)
                         3. 401 + revoke if expired
                         4. Same claims-sign + rotate-token steps as login
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

`IIdentityProviderPort` is shaped so a second adapter (e.g. Cognito) could
implement it later without touching `application`/`domain` — but per YAGNI,
no second adapter is built now.

> Boundary rule: cross-context imports are allowed **only** from
> `infrastructure/adapters/`. `src/core/security/` (`JwtAuthGuard`,
> `@CurrentUser()`, `JwtService`) is cross-cutting infra, not owned by this
> context — both `identity` and `tenancy` depend on it directly, which is
> fine (it isn't `@contexts/*`).

---

## Public API

### REST (`/api/v1/auth/*`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/v1/auth/register` | — | Create the user in Keycloak + locally. 201, or 409 if the email is taken. |
| `POST` | `/api/v1/auth/login` | — | Verify credentials, issue tokens. 200 `{ accessToken, refreshToken }`, or 401. |
| `POST` | `/api/v1/auth/refresh` | — (refresh token in body) | Rotate the refresh token, issue a new access token. 200, or 401. |

### Commands & queries

| Class | Description |
|-------|-------------|
| `RegisterUserCommand` | Creates the user (Keycloak + local row) |
| `LoginUserCommand` | Verifies credentials, issues a session |
| `RefreshSessionCommand` | Rotates the refresh token |
| `UserFindByEmailQuery` | Read-side lookup — used internally and by `tenancy`'s `UserLookupAdapter` |

### Domain events

`UserRegisteredEvent` — emitted by `user.create()`.

---

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `JWT_SECRET` | `dev-insecure-secret-change-me` | Signs access tokens — set a real secret outside local dev |
| `JWT_EXPIRES_IN` | `15m` | Access token TTL |
| `REFRESH_TOKEN_TTL_DAYS` | `30` | Opaque refresh token TTL |
| `COOKIE_DOMAIN` | unset | `.sisqueslabs.com` in production once apps share the domain |
| `KEYCLOAK_BASE_URL` | `http://localhost:8083` | |
| `KEYCLOAK_REALM` | `sisques-account` | |
| `KEYCLOAK_CLIENT_ID` | `account-api` | Confidential client, service account + direct grants |
| `KEYCLOAK_CLIENT_SECRET` | `local-dev-secret-change-me` | |

## Testing

```bash
pnpm test src/contexts/identity        # unit
pnpm test:integration                  # user repository, real Postgres
pnpm test:e2e                          # full register/login/refresh flow, real Keycloak
```

Unit tests mock `IIdentityProviderPort`/`ITenantMembershipLookupPort` and
every repository — no network or DB needed. `KeycloakIdentityProviderAdapter`
itself is unit-tested with a mocked `global.fetch`. Real Keycloak is only
exercised at the e2e layer (see root README "Running tests").

TypeORM mappers/repositories are intentionally **not** unit-tested in
isolation (mocking a TypeORM `Repository` is low-value) — they're covered by
`test/integration/user.repository.integration-spec.ts` against real Postgres
instead (see `package.json`'s `collectCoverageFrom` exclusions for this
layer).
