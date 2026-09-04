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

`TenantRoleEnum` (`OWNER`, `ADMIN`, `MEMBER`) — a fixed, closed set, wrapped
by `TenantRoleValueObject` (`EnumValueObject<typeof TenantRoleEnum>`). The
tenant creator is auto-assigned `OWNER` (`CreateTenantCommandHandler`), and
the architecture doc's business rule "every tenant must have at least one
owner" is enforced at the service layer where relevant. `AddTenantMemberCommand`
accepts any of the three roles for a new member.

---

## Authorization: `TenantPermissionGuard`

Every tenant-scoped mutation/query beyond simple existence (`updateTenant`,
`deleteTenant`, `addTenantMember`, and the member-listing reads) requires a
specific permission, not just "is a member" — enforced by
`TenantPermissionGuard` (`infrastructure/guards/tenant-permission.guard.ts`)
plus the `@RequiresPermission(permission)` decorator
(`infrastructure/decorators/requires-permission.decorator.ts`), applied
per-endpoint after `JwtAuthGuard`.

`TenantPermissionEnum` (`domain/enums/tenant-permission.enum.ts`) defines four
generic, platform-level permissions — layer 1 of the tenancy model (see "What
this context owns" above); never app-specific semantics:

| Permission | Meaning |
|------------|---------|
| `VIEW_TENANT` | Read the tenant / list its members |
| `MANAGE_TENANT` | Update the tenant's editable fields (`name`, `slug`) |
| `DELETE_TENANT` | Hard-delete the tenant |
| `MANAGE_MEMBERS` | Add a member to the tenant |

`TENANT_ROLE_PERMISSIONS` (`domain/enums/tenant-role-permissions.map.ts`) is
the fixed, code-defined `TenantRoleEnum -> TenantPermissionEnum[]` mapping —
no admin UI/API to customize it per tenant in this iteration:

| Role | Permissions |
|------|-------------|
| `OWNER` | all four |
| `ADMIN` | `VIEW_TENANT`, `MANAGE_TENANT`, `MANAGE_MEMBERS` (not `DELETE_TENANT`) |
| `MEMBER` | `VIEW_TENANT` only |

`TenantPermissionGuard` reads the caller's tenant role straight from
`request.user.tenants` (populated by `JwtAuthGuard` from the JWT's `tenants`
claim) — the same pattern `PlatformAdminGuard` uses for
`request.user.platformAdmin` — rather than querying
`ITenantMembershipReadRepository` per request. It resolves the target
`tenantId` from the REST route param or the GraphQL `input.tenantId` arg,
looks up the caller's membership for that specific tenant, and throws
`ForbiddenException` when there's no membership for that tenant or the
role's permission set doesn't include the one required by
`@RequiresPermission()`.

**Stale claims**: because the permission check reads the JWT instead of the
database, a caller's `tenants` claim only reflects memberships that existed
at the time their access token was last issued (login or refresh) — *not*
memberships granted during the current session. Concretely: a user who logs
in and then creates a tenant becomes its `OWNER` in the database
immediately, but their **existing** access token still has no entry for
that tenant until they call `POST /auth/refresh` (or log in again). The
same applies to being added as a member to someone else's tenant mid-session.
This is the same staleness class `platformAdmin` already has in this
codebase; there is no push/invalidation mechanism. API consumers that act on
a tenant right after creating it (or right after being granted a new
membership) must refresh their session first.

**Adding a new tenant-scoped endpoint**: `TenantPermissionGuard` is wired
explicitly per-endpoint (`@UseGuards(TenantPermissionGuard)` +
`@RequiresPermission(...)`), not a global interceptor. Any future
tenant-scoped REST route or GraphQL operation must apply both itself — it
will **not** automatically inherit enforcement from this change.

`UpdateTenantCommandHandler` relies solely on `TenantPermissionGuard` for
authorization — it does **not** call `AssertTenantOwnerService`, so both
`OWNER` and `ADMIN` (both hold `MANAGE_TENANT`) can update a tenant, matching
the permission map above. `DeleteTenantCommandHandler` still calls
`AssertTenantOwnerService` in addition to the guard, since `DELETE_TENANT` is
`OWNER`-only in the permission map anyway — that check is redundant with the
guard today but kept as defense-in-depth for the one operation where the two
line up exactly.

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
PATCH /tenants/{tenantId}   ->  TenantPermissionGuard (MANAGE_TENANT)
                             ->  UpdateTenantCommand { tenantId, requesterUserId, name?, slug? }
                             ->  UpdateTenantCommandHandler
                                 1. AssertTenantExistsService (404)
                                 2. AssertTenantSlugAvailableService, but only
                                    when the new slug actually differs from the
                                    tenant's current one (409 otherwise)
                                 3. tenant.update() -> save

DELETE /tenants/{tenantId}  ->  TenantPermissionGuard (DELETE_TENANT)
                             ->  DeleteTenantCommand { tenantId, requesterUserId }
                             ->  DeleteTenantCommandHandler
                                 1. AssertTenantExistsService (404)
                                 2. AssertTenantOwnerService — requester must hold
                                    the OWNER membership for this tenant (403
                                    NotTenantOwnerException otherwise; redundant
                                    with the guard today since DELETE_TENANT is
                                    OWNER-only, kept as defense-in-depth)
                                 3. tenant.delete() -> delete
```

Delete is a hard delete — the tenant row is physically removed. There is no
DB-level FK cascade from `tenant_membership.tenant_id`, so
`DeleteTenantCommandHandler` also bulk-deletes the tenant's memberships
(`ITenantMembershipWriteRepository.deleteAllByTenantId`) in the same
transaction-less sequence, to avoid leaving orphan rows.

## How adding a member works

```
POST /tenants/{tenantId}/members  ->  TenantPermissionGuard (MANAGE_MEMBERS)
                                   ->  AddTenantMemberCommand { tenantId, email, role }
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

`GET /tenants/{tenantId}/members` — guarded by `TenantPermissionGuard`
(`VIEW_TENANT`, held by all three roles). 404s if the tenant doesn't exist,
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
  `tenantMembershipsFindByTenantId(input: TenantMembershipFindByTenantIdRequestDto)`
  (guarded by `TenantPermissionGuard` + `VIEW_TENANT`).
- `TenantMutationsResolver` — `tenantCreate` (`@CurrentUser()` + `JwtAuthGuard`
  only — anyone authenticated may create a tenant), `tenantUpdate`
  (`TenantPermissionGuard` + `MANAGE_TENANT`), `tenantDelete`
  (`TenantPermissionGuard` + `DELETE_TENANT`), and `tenantMemberAdd`
  (`TenantPermissionGuard` + `MANAGE_MEMBERS`) — same permission rules as the
  REST handlers. All four return the shared `MutationResponseDto`.

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
| `PATCH` | `/api/v1/tenants/{tenantId}` | JWT, `MANAGE_TENANT` | Update a tenant's `name`/`slug`. 200, 403 (no membership or insufficient role), 404, or 409 (slug). |
| `DELETE` | `/api/v1/tenants/{tenantId}` | JWT, `DELETE_TENANT` (owner-only) | Hard-delete a tenant and its memberships. 204, 403 (no membership or not owner), or 404. |
| `POST` | `/api/v1/tenants/{tenantId}/members` | JWT, `MANAGE_MEMBERS` | Add an existing user as a member, by email. 201, 403 (no membership or insufficient role), 404 (tenant or user), or 409 (already a member). |
| `GET` | `/api/v1/tenants/{tenantId}/members` | JWT, `VIEW_TENANT` | List a tenant's members. 200, 403 (no membership), or 404. |

### GraphQL

| Operation | Auth | Description |
|-----------|------|-------------|
| `mutation tenantCreate` | JWT | Create a tenant; caller becomes owner. |
| `mutation tenantUpdate` | JWT, `MANAGE_TENANT` | Update a tenant's `name`/`slug`. |
| `mutation tenantDelete` | JWT, `DELETE_TENANT` (owner-only) | Hard-delete a tenant and its memberships. |
| `mutation tenantMemberAdd` | JWT, `MANAGE_MEMBERS` | Add an existing user as a member, by email. |
| `query tenantsFindByCriteria` | JWT, platform admin | List tenants, filterable/sortable via `TenantFilterInput`/`TenantSortInput`, paginated. |
| `query tenantMembershipsFindByTenantId` | JWT, `VIEW_TENANT` | List a tenant's members. |

### Commands & queries

| Class | Description |
|-------|-------------|
| `CreateTenantCommand` | Creates a tenant + owner membership for the creator |
| `UpdateTenantCommand` | Rename/re-slug a tenant — requires `MANAGE_TENANT` (guard-only; `OWNER` and `ADMIN` both qualify) |
| `DeleteTenantCommand` | Owner-only hard delete of a tenant + its memberships (`DELETE_TENANT`, guard and handler agree) |
| `AddTenantMemberCommand` | Adds an existing user (by email) as a member — requires `MANAGE_MEMBERS` |
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
pnpm test src/contexts/tenancy         # unit (domain enums, guard/decorator, REST + GraphQL layers)
pnpm test src/contexts/app             # unit
pnpm test:integration                  # App/Tenant/TenantMembership repos, real Postgres
pnpm test:e2e                          # full create-app/create-tenant/add-member flow, REST and GraphQL,
                                        # plus TenantPermissionGuard RBAC coverage
```

Same layering note as `user`/`auth`: TypeORM mappers/repositories are
covered by `test/integration/tenancy.repository.integration-spec.ts` (real
Postgres, including the real FK to `user`'s `user` table for memberships),
not by isolated unit specs.

`TenantPermissionGuard` has no persistence boundary of its own (it reads
only `request.user` from the already-verified JWT), so it's covered by unit
specs (`infrastructure/guards/tenant-permission.guard.spec.ts`,
`infrastructure/decorators/requires-permission.decorator.spec.ts`,
`domain/enums/tenant-role-permissions.map.spec.ts`) plus E2E
(`test/tenancy-rbac.e2e-spec.ts` for REST,
`test/tenancy-rbac-graphql.e2e-spec.ts` for GraphQL — sufficient-role,
insufficient-role, and non-member cases for all four guarded operations) —
no dedicated `test/integration/*.integration-spec.ts` layer for it.
