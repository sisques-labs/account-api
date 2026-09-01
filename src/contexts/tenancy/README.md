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

## How updating/deleting a tenant works

```
PATCH /tenants/{tenantId}   ->  UpdateTenantCommand { tenantId, requesterUserId, name?, slug? }
DELETE /tenants/{tenantId}  ->  DeleteTenantCommand { tenantId, requesterUserId }
                             ->  {Update,Delete}TenantCommandHandler
                                 1. AssertTenantExistsService (404)
                                 2. AssertTenantOwnerService — requester must hold
                                    the "owner" membership for this tenant (403
                                    NotTenantOwnerException otherwise)
                                 3. Update: AssertTenantSlugAvailableService, but
                                    only when the new slug actually differs from
                                    the tenant's current one (409 otherwise)
                                 4. tenant.update()/tenant.delete() -> save/delete
```

Delete is a hard delete — the tenant row is physically removed. There is no
DB-level FK cascade from `tenant_membership.tenant_id`, so
`DeleteTenantCommandHandler` also bulk-deletes the tenant's memberships
(`ITenantMembershipWriteRepository.deleteAllByTenantId`) in the same
transaction-less sequence, to avoid leaving orphan rows.

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

## GraphQL

`transport/graphql/` mirrors the REST surface for both aggregates, split per
the architecture skill's resolver convention:

- `TenantQueriesResolver` — `tenantsFindByCriteria(input: TenantFindByCriteriaRequestDto)`
  (guarded by `PlatformAdminGuard`, same restriction as `GET /tenants`; type-safe
  Criteria pattern: `TenantQueryableField` + `tenantFilterableFields` registry +
  `TenantFilterInput`/`TenantSortInput`) and
  `tenantMembershipsFindByTenantId(input: TenantMembershipFindByTenantIdRequestDto)`.
- `TenantMutationsResolver` — `tenantCreate`, `tenantUpdate`, `tenantDelete`
  (all `@CurrentUser()` + `JwtAuthGuard`, same owner-only rules as the REST
  handlers) and `tenantMemberAdd`. All four return the shared
  `MutationResponseDto`.

`TenantRoleEnum` is registered as a GraphQL enum (`transport/graphql/enums/tenant/tenant-registered-enums.graphql.ts`,
alongside `TenantQueryableFieldEnum`) so `TenantAddMemberRequestDto.role` and
`TenantMembershipResponseDto.role` are strongly typed in the schema, not free
strings. No resolved fields yet — `Tenant.appId` and `TenantMembership.userId`/`tenantId`
stay as raw FKs, same as the REST response DTOs; a `Tenant.app`/`TenantMembership.user`
resolved field would need `IAppLookupPort`/`IUserLookupPort` to grow a real
lookup method beyond their current `assertExists`/`findUserIdByEmail`.

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
| `PATCH` | `/api/v1/tenants/{tenantId}` | JWT, owner | Update a tenant's `name`/`slug`. 200, 403 (not owner), 404, or 409 (slug). |
| `DELETE` | `/api/v1/tenants/{tenantId}` | JWT, owner | Hard-delete a tenant and its memberships. 204, 403 (not owner), or 404. |
| `POST` | `/api/v1/tenants/{tenantId}/members` | JWT | Add an existing user as a member, by email. 201, 404 (tenant or user), or 409 (already a member). |
| `GET` | `/api/v1/tenants/{tenantId}/members` | JWT | List a tenant's members. 200, or 404. |

### GraphQL

| Operation | Auth | Description |
|-----------|------|-------------|
| `mutation tenantCreate` | JWT | Create a tenant; caller becomes owner. |
| `mutation tenantUpdate` | JWT, owner | Update a tenant's `name`/`slug`. |
| `mutation tenantDelete` | JWT, owner | Hard-delete a tenant and its memberships. |
| `mutation tenantMemberAdd` | JWT | Add an existing user as a member, by email. |
| `query tenantsFindByCriteria` | JWT, platform admin | List tenants, filterable/sortable via `TenantFilterInput`/`TenantSortInput`, paginated. |
| `query tenantMembershipsFindByTenantId` | JWT | List a tenant's members. |

### Commands & queries

| Class | Description |
|-------|-------------|
| `CreateTenantCommand` | Creates a tenant + owner membership for the creator |
| `UpdateTenantCommand` | Owner-only rename/re-slug of a tenant |
| `DeleteTenantCommand` | Owner-only hard delete of a tenant + its memberships |
| `AddTenantMemberCommand` | Adds an existing user (by email) as a member |
| `AppFindByCriteriaQuery` | Lists apps with pagination/filters — lives in `app` context |
| `TenantMembershipFindByTenantIdQuery` | Lists a tenant's members |
| `TenantMembershipFindByUserIdQuery` | Lists a user's memberships — consumed cross-context by `auth` |

### Domain events

`TenantCreatedEvent`, `TenantUpdatedEvent` (+ `TenantNameChangedEvent`/`TenantSlugChangedEvent`),
`TenantDeletedEvent`, `TenantMembershipCreatedEvent`, `TenantMembershipUpdatedEvent`
(+ `TenantMembershipRoleChangedEvent`), `TenantMembershipDeletedEvent`.

---

## Testing

```bash
pnpm test src/contexts/tenancy         # unit (REST + GraphQL layers)
pnpm test src/contexts/app             # unit
pnpm test:integration                  # App/Tenant/TenantMembership repos, real Postgres
pnpm test:e2e                          # full create-app/create-tenant/add-member flow, REST and GraphQL
```

Same layering note as `user`/`auth`: TypeORM mappers/repositories are
covered by `test/integration/tenancy.repository.integration-spec.ts` (real
Postgres, including the real FK to `user`'s `user` table for memberships),
not by isolated unit specs.
