# User Context

## What this context owns

`user` owns the platform identity **record** — nothing about how someone
proves who they are, only who they are:

- `id`, `externalId` (the identity provider's subject — Keycloak's `sub`
  today), `email`, `displayName`, `platformAdmin` (unused by any MVP
  endpoint, but a real column per the architecture doc's schema).

What it does **not** own: passwords, sessions/refresh tokens, JWT issuance,
or the Keycloak adapter — that's the `auth` context. It also doesn't own
tenants, memberships, or roles — that's the `tenancy` context (layer 1 of
the platform's two-layer tenancy model; see the architecture doc).

---

## One context, or two, or three? (user vs. auth vs. tenancy)

**Three**, each a different aggregate with a different lifecycle and
different consumers:

- A user can exist with zero tenants (just registered, hasn't created or
  joined one yet) — that's the `user`/`tenancy` split, unchanged from the
  platform's original two-layer tenancy model (see the architecture doc).
- `user` (who you are) and `auth` (how you prove it, and the session that
  follows) were originally one context, but were split once it became clear
  they have genuinely different reasons to change: `user` changes when the
  platform's notion of identity changes (new profile fields, a second
  identity provider); `auth` changes when the authentication *mechanism*
  changes (a new session model, MFA, a different token scheme) — Cognito
  could replace Keycloak tomorrow without `user`'s schema caring at all, and
  a multi-device session table could replace the current single-session
  `auth.session` table without `user` caring either.
- A user with zero sessions is a perfectly valid state (registered, never
  logged in) — the same "can exist without the other" test that justified
  the `tenancy` split applies here too.
- `tenant.app_id` and `tenant_membership` reference *users* by id but have
  no reason to know how identity works internally (Keycloak, password
  policy, refresh-token mechanics) — that one-way dependency is exactly what
  the cross-context port/adapter seam is for.

All three contexts depend on each other only through ports —
`auth` needs a user's tenant memberships (for JWT claims) and needs to
create/look up `user` rows; `tenancy` needs to resolve an email to a userId
(to add a member). Every direction goes through `application/ports/` +
`infrastructure/adapters/` dispatching via `CommandBus`/`QueryBus`, never a
direct domain/application import (enforced by the `boundaries/element-types`
ESLint rule). See `auth`'s README for the `auth` ⇄ `user` ports in detail.

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

Methods: `create()` (emits `UserRegisteredEvent`); `update()`, `delete()`,
and private `changeEmail()` / `changeDisplayName()` / `changePlatformAdmin()`
(each a no-op if the value is unchanged, otherwise emits the matching
`*Changed` event plus `UserUpdatedEvent`/`UserDeletedEvent`) — prepared for
future use, not yet exposed via a command (no `UpdateUserCommand`/
`DeleteUserCommand` exists today).

---

## How a user gets created

`user` never creates itself from an HTTP request — it's always driven
cross-context by `auth`'s registration flow (see `auth`'s README for the
full `register` sequence):

```
CreateUserCommand (dispatched by auth's UserProvisioningAdapter)
  -> CreateUserCommandHandler
     1. AssertUserEmailAvailableService (409 if taken — defense in depth;
        auth already pre-checks via IUserLookupPort before calling Keycloak)
     2. UserBuilder -> user.create() -> save
```

---

## Cross-context ports (consumed, not owned)

`user` doesn't call any other context — it's a pure leaf. It's reached by:

| Consumer | Port | Dispatches |
|----------|------|-----------|
| `auth` | `IUserLookupPort` | `UserFindByEmailQuery` / `UserFindByIdQuery` |
| `auth` | `IUserProvisioningPort` | `CreateUserCommand` |
| `tenancy` | `IUserLookupPort` (tenancy's own, narrower version) | `UserFindByEmailQuery` |

> Boundary rule: cross-context imports are allowed **only** from
> `infrastructure/adapters/`. `src/core/security/` (`JwtAuthGuard`,
> `@CurrentUser()`, `JwtService`) is cross-cutting infra, not owned by any
> context — that's fine (it isn't `@contexts/*`).

---

## Public API

No REST/GraphQL/MCP transport of its own — `auth` is the only public entry
point that touches a user today (registration/login/refresh).

### Commands & queries

| Class | Description |
|-------|-------------|
| `CreateUserCommand` | Creates the local user row — dispatched cross-context by `auth` |
| `UserFindByEmailQuery` | Read-side lookup by email — consumed by `auth` and `tenancy` |
| `UserFindByIdQuery` | Read-side lookup by id — consumed by `auth`'s refresh flow |

### Domain events

| Event | Emitted by |
|-------|-----------|
| `UserRegisteredEvent` | `user.create()` |
| `UserUpdatedEvent` | `user.update()` |
| `UserDeletedEvent` | `user.delete()` |
| `UserEmailChangedEvent` | `user.update()` when `email` changes |
| `UserDisplayNameChangedEvent` | `user.update()` when `displayName` changes |
| `UserPlatformAdminChangedEvent` | `user.update()` when `platformAdmin` changes |

`update()`/`delete()` and their events are prepared for future use — no
command dispatches them yet (see "Core aggregate" above).

---

## Testing

```bash
pnpm test src/contexts/user            # unit
pnpm test:integration                  # user repository, real Postgres
pnpm test:e2e                          # full register/login/refresh flow, real Keycloak
```

Unit tests mock every repository and application service — no network or DB
needed. TypeORM mappers/repositories are intentionally **not** unit-tested
in isolation (mocking a TypeORM `Repository` is low-value) — they're covered
by `test/integration/user.repository.integration-spec.ts` against real
Postgres instead (see `package.json`'s `collectCoverageFrom` exclusions for
this layer).
