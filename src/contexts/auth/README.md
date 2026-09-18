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
  (see below), chained across rotations.

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
| `revokedAt` | `DateValueObject \| null` | Set once this token is consumed (rotated or reuse-detected); `null` while active |
| `replacedBySessionId` | `UuidValueObject \| null` | Self-referencing link to this session's successor in the chain |

Methods: `isExpired(now?)`, `revoke(replacedBySessionId)`, `isRevoked()`,
`markReuseDetected()`. No domain events — nothing consumes a session-issued
event.

**Session chain model (linked list, not `family_id`).** The `session` table
no longer enforces `UNIQUE(user_id)`: a user chain is a linked list of
`SessionAggregate` rows, `replaced_by_session_id`-linked (self FK,
`ON DELETE SET NULL`). Each rotation locks the presented row
(`pessimistic_write`), INSERTs the successor **before** UPDATE-ing the
predecessor's `revoked_at`/`replaced_by_session_id` (the self-FK rejects a
reference to a row that doesn't exist yet — `gardenia-api`'s own documented
ordering bug). Reuse of an already-revoked token invalidates the whole chain
via `revokeAllByUserId` (over-revocation of a user's other chains is an
accepted MVP tradeoff — one chain per user in practice). Unlike
`gardenia-api`, there is **no reuse grace window**: a second concurrent
refresh with the same token is rejected outright, per
`auth-session-rotation/spec.md`.

`ISessionWriteRepository.rotate()`/`revokeAllByUserId()` are wired into
`RefreshSessionCommandHandler` (WU-3b): every refresh locks the presented
row, checks `isRevoked()` first (reuse — invalidates the whole chain and
401s via `RefreshTokenReuseDetectedException`), then `isExpired()`, then
rotates. `LoginUserCommandHandler` always creates a brand-new chain-root
session on every login instead of rotating an existing row in place — a
user can hold more than one active chain (e.g. multiple devices).

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
                       4. ReconcilePlatformAdminService.execute({email,
                          currentPlatformAdmin, platformAdminEmails}) — pure
                          function of PLATFORM_ADMIN_EMAILS (config); returns
                          null when the var is unset or no change is needed,
                          otherwise the reconciled boolean
                       5. IF non-null: IUserPlatformAdminPort.setPlatformAdmin()
                          -> dispatches SetUserPlatformAdminCommand into
                             `user` (via CommandBus)
                       6. TokenSignService.execute({sub, email, platformAdmin,
                          tenants}) — platformAdmin is the RECONCILED value,
                          never the value read before step 4
                       7. Generate + hash a new opaque refresh token; always
                          create a brand-new chain-root SessionAggregate
                          (never rotates an existing row — see "Session
                          chain model" above)
                       8. Return { accessToken, refreshToken } (JSON body +
                          cookies — see root README)
```

### `PLATFORM_ADMIN_EMAILS` reconciliation (platform-admin-bootstrap)

Every login reconciles the authenticating user's `platformAdmin` flag
against `PLATFORM_ADMIN_EMAILS` — see
`openspec/changes/account-platform-mvp/specs/platform-admin-bootstrap/spec.md`
for the full requirement. Tri-state handling, computed once in
`authConfig` (`src/core/config/auth.config.ts`):

| `PLATFORM_ADMIN_EMAILS` | `authConfig().platformAdminEmails` | Effect |
|---|---|---|
| unset (absent from `process.env`) | `null` | Skip reconciliation entirely — existing flags untouched |
| `""` (set, empty) | `[]` | Revoke every currently-granted admin |
| `"a@x.com,b@x.com"` | `['a@x.com', 'b@x.com']` (trimmed + lowercased) | Grant listed emails, revoke everyone else |

`ReconcilePlatformAdminService` is a pure function — it never reads
`ConfigService` or dispatches anything itself; `LoginUserCommandHandler`
reads the config value and owns the dispatch decision. `user`'s
`SetUserPlatformAdminCommandHandler` adds a second, independent no-op
short-circuit (see `user`'s README) so a redundant dispatch never emits a
spurious `UserUpdatedEvent`.

## How refresh works

```
POST /auth/refresh  ->  RefreshSessionCommandHandler
                         1. Hash the presented raw token
                         2. ISessionWriteRepository.rotate(hash, callback) —
                            locks (`SELECT ... FOR UPDATE`) the session row
                            matching the presented hash inside one
                            transaction; 401 (InvalidRefreshTokenException)
                            if no row matches
                         3. Inside the locked callback:
                            a. isRevoked()? -> reuse: markReuseDetected(),
                               revokeAllByUserId(userId) (invalidates the
                               WHOLE chain), throw
                               RefreshTokenReuseDetectedException (401) —
                               no grace window, a concurrent second request
                               on the same token is always rejected
                            b. isExpired()? -> InvalidRefreshTokenException
                               (401)
                            c. otherwise: build the successor session,
                               revoke(successor.id) on the current row;
                               the repository INSERTs the successor BEFORE
                               UPDATE-ing the predecessor (self-FK ordering)
                         4. IUserLookupPort.findById(successor.userId) — the
                            session only has a userId, not an email, which
                            is why this find-by-id path exists
                         5. Same claims-sign steps as login; the new opaque
                            refresh token was generated and hashed before
                            the locked transaction
```

A replayed/already-consumed refresh token invalidates every session in its
chain, including a legitimate holder's never-yet-used successor token — that
holder must log in again to establish a new chain (see
`auth-session-rotation/spec.md`'s "Legitimate use after chain invalidation"
scenario).

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
call-on-every-request model). `platformAdmin` specifically reflects the
value AFTER that login's `PLATFORM_ADMIN_EMAILS` reconciliation (see
"How login works" above) — never the value read before it.

---

## Cross-context ports

| Port | Adapter | Dispatches | Used by |
|------|---------|-----------|---------|
| `IIdentityProviderPort` (`registerIdentity` / `verifyCredentials`) | `KeycloakIdentityProviderAdapter` | HTTP calls to Keycloak's Admin API + token endpoint — the only external I/O in this context | register, login |
| `ITenantMembershipLookupPort` (`findMembershipsByUserId`) | `TenantMembershipLookupAdapter` | `TenantMembershipFindByUserIdQuery` (tenancy, via `QueryBus`) | login, refresh (JWT claims) |
| `IUserLookupPort` (`findByEmail` / `findById`) | `UserLookupAdapter` | `UserFindByEmailQuery` / `UserFindByIdQuery` (user, via `QueryBus`) | register (pre-check), login, refresh |
| `IUserProvisioningPort` (`createUser`) | `UserProvisioningAdapter` | `CreateUserCommand` (user, via `CommandBus`) | register |
| `IUserPlatformAdminPort` (`setPlatformAdmin`) | `UserPlatformAdminAdapter` | `SetUserPlatformAdminCommand` (user, via `CommandBus`) | login (`PLATFORM_ADMIN_EMAILS` reconciliation) |

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
| `JWT_PRIVATE_KEY` | unset (ephemeral dev keypair) | Base64-encoded RSA private key PEM; signs access tokens (RS256). Required in production — see `src/core/config/env.validation.ts` |
| `JWT_EXPIRES_IN` | `15m` | Access token TTL |
| `REFRESH_TOKEN_TTL_DAYS` | `30` | Opaque refresh token TTL |
| `PLATFORM_ADMIN_EMAILS` | unset (`null` — reconciliation skipped) | Comma-separated allowlist, trimmed + lowercased. `""` revokes every admin; see "PLATFORM_ADMIN_EMAILS reconciliation" above |
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
