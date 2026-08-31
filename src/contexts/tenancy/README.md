# Tenancy Context

## What this context owns

`tenancy` implements **layer 1** of the platform's tenancy model (see the
architecture doc, "Modelo de tenancy"): the mechanics of a tenant — name,
members, roles — shared identically across every app. What a role *means*
inside a given app (layer 2, e.g. Gardenia's "member" can water but not
delete plants) is that app's own concern; this context stores and returns
roles as opaque labels, never interprets them.

It owns two aggregates:

- **Tenant** — belongs to exactly one app (`UNIQUE(app_id, slug)`).
- **TenantMembership** — a user's role within a tenant
  (`UNIQUE(tenant_id, user_id)`).

The **App** aggregate (one row per app in the ecosystem — Gardenia, Nexora, …)
lives in the separate `app` context. `tenant.app_id` is a required FK; tenancy
reaches `app` only through `IAppLookupPort` + `AppLookupAdapter` (QueryBus),
never a direct domain import.

See `src/contexts/app/` for app registration (`POST /apps`, `GET /apps`).
The `POST /apps` endpoint exists purely as bootstrapping plumbing (not called
out in the architecture doc's MVP endpoint list) — without it, `POST /tenants`
would be untestable.

See `src/contexts/user/README.md` ("One context or two?") for why the
platform identity (`user`/`auth`) and tenancy are separate contexts rather
than one.

---

## The `role` field

Free text (`TenantRoleValueObject`, a `StringValueObject`, not an enum) — by
design. `"owner"` is the only value with fixed platform meaning: the tenant
creator is auto-assigned it (`CreateTenantCommandHandler`), and the
architecture doc's business rule "every tenant must have at least one owner"
is enforced at the service layer where relevant (not a DB constraint, since
roles are free text). Every other role string (`"member"`, `"admin"`,
whatever a given app wants) is accepted as-is by `AddTenantMemberCommand` —
this context never validates or interprets it beyond "non-empty".

---

## How tenant creation works

```
POST /tenants  ->  TenantsController (JwtAuthGuard, @CurrentUser())
               ->  CreateTenantCommand { appId, name, slug?, creatorUserId }
               ->  CreateTenantCommandHandler
                   1. AssertAppExistsService -> IAppLookupPort (404 if the app doesn't exist)
                   2. AssertTenantSlugAvailableService (409 if app+slug taken)
                      — slug defaults to a slugified `name` when omitted
                   3. TenantBuilder -> tenant.create() -> save
                   4. TenantMembershipBuilder (role="owner", userId=creator)
                      -> membership.create() -> save
```

Both the tenant and the owner membership are created in the same handler —
there is no two-step "create tenant, then separately add yourself as owner"
because the invariant (every tenant has an owner) must never be violated,
even transiently.

## How adding a member works

```
POST /tenants/{tenantId}/members  ->  AddTenantMemberCommand { tenantId, email, role }
                                   ->  AddTenantMemberCommandHandler
                                       1. AssertTenantExistsService (404)
                                       2. IUserLookupPort.findUserIdByEmail()
                                          -> UserLookupAdapter dispatches
                                             UserFindByEmailQuery (user)
                                          -> 404 (MemberUserNotFoundException)
                                             if no such user
                                       3. AssertTenantMembershipAvailableService
                                          (409 if already a member)
                                       4. TenantMembershipBuilder -> save
```

By email, not user id — no invite-by-email flow exists yet (that's
`tenant_invite`, explicitly out of MVP scope per the architecture doc), but
the person adding a member still shouldn't need to know internal UUIDs.

## Listing members

`GET /tenants/{tenantId}/members` — 404s if the tenant doesn't exist,
otherwise returns every `TenantMembershipViewModel` for it (`id`, `tenantId`,
`userId`, `role`, timestamps). No email/displayName enrichment — that would
require reaching into `user`'s data for a read-side join, which the
MVP skips (the client can correlate `userId` itself); a real join is
reasonable follow-up work once there's a concrete UI need for it.

---

## Cross-context port

| Port | Adapter | Dispatches | Used by |
|------|---------|-----------|---------|
| `IUserLookupPort` (`findUserIdByEmail`) | `UserLookupAdapter` | `UserFindByEmailQuery` (user, via `QueryBus`) | `AddTenantMemberCommandHandler` |
| `IAppLookupPort` (`assertExists`) | `AppLookupAdapter` | `AppFindByIdQuery` (app, via `QueryBus`) | `AssertAppExistsService` → `CreateTenantCommandHandler` |

`tenancy` also **exposes** `TenantMembershipFindByUserIdQuery`, consumed
cross-context by `auth`'s `TenantMembershipLookupAdapter` (JWT claims at
login/refresh) — see `auth`'s README.

> Boundary rule: cross-context imports are allowed **only** from
> `infrastructure/adapters/`. This context's controllers import
> `JwtAuthGuard`/`@CurrentUser()` from `src/core/security/` directly — that's
> cross-cutting infra (not `@contexts/user` or `@contexts/auth`), so it isn't
> a boundary violation.

---

## Public API

### REST (`/api/v1/tenants/*`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/v1/tenants` | JWT | Create a tenant; caller becomes owner. 201, 404 (app), or 409 (slug). |
| `POST` | `/api/v1/tenants/{tenantId}/members` | JWT | Add an existing user as a member, by email. 201, 404 (tenant or user), or 409 (already a member). |
| `GET` | `/api/v1/tenants/{tenantId}/members` | JWT | List a tenant's members. 200, or 404. |

### Commands & queries

| Class | Description |
|-------|-------------|
| `CreateTenantCommand` | Creates a tenant + owner membership for the creator |
| `AddTenantMemberCommand` | Adds an existing user (by email) as a member |
| `AppFindByCriteriaQuery` | Lists apps with pagination/filters — lives in `app` context |
| `TenantMembershipFindByTenantIdQuery` | Lists a tenant's members |
| `TenantMembershipFindByUserIdQuery` | Lists a user's memberships — consumed cross-context by `auth` |

### Domain events

`TenantCreatedEvent`, `TenantMembershipCreatedEvent`.

---

## Testing

```bash
pnpm test src/contexts/tenancy         # unit
pnpm test src/contexts/app             # unit
pnpm test:integration                  # App/Tenant/TenantMembership repos, real Postgres
pnpm test:e2e                          # full create-app/create-tenant/add-member flow
```

Same layering note as `user`/`auth`: TypeORM mappers/repositories are
covered by `test/integration/tenancy.repository.integration-spec.ts` (real
Postgres, including the real FK to `user`'s `user` table for memberships),
not by isolated unit specs.
