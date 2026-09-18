## Context

See `proposal.md` — Why. Two facts from the current codebase shape this design directly:

- The access token already carries per-tenant role claims: `IAccessTokenClaims`/`CurrentUserPayload.tenants: Array<{ tenantId, role }>`, populated by `auth` at issuance and decoded by the existing `JwtAuthGuard` into `request.user`. No new claim or token change is needed.
- `tenants.controller.ts` already documents `@ApiResponse({ status: 403, description: 'Caller is not an owner of the tenant' })` on update/delete, but no code enforces it — those responses are currently unreachable. This change makes that existing documentation true rather than introducing a new contract.

## Goals / Non-Goals

**Goals:**
- Enforce tenant-scoped permission checks at the transport boundary (guard), consistent with how `JwtAuthGuard`/`PlatformAdminGuard` already work.
- Keep the permission model inside `tenancy` (layer 1, generic permissions) — no app-specific semantics.
- Zero additional DB round-trip per request beyond what `JwtAuthGuard` already does.

**Non-Goals:**
- No admin UI or API to customize role→permission mappings per tenant (fixed, code-defined mapping for this change).
- No change to the JWT claim shape or token issuance flow (`auth` context untouched).
- No retroactive audit of past unauthorized actions.

## Decisions

### Permission source: JWT claims, not a `TenantMembership` DB lookup
The guard reads the caller's role for the target tenant from `request.user.tenants` (already populated by `JwtAuthGuard`), the same way `PlatformAdminGuard` reads `request.user.platformAdmin`. Alternative considered: have the guard inject `ITenantMembershipReadRepository` and query the DB per request. Rejected — it duplicates data already in the token, adds a DB hit to every tenant-scoped request, and breaks the pattern every other guard in this codebase already follows. Trade-off accepted below (staleness).

### Enum + role mapping live in `tenancy/domain/enums/`, guard + decorator in `tenancy/infrastructure/`
Per the architecture skill's context structure, a context-owned guard/decorator belongs under `infrastructure/guards/` and `infrastructure/decorators/` (mirroring `src/core/security/guards|decorators`, but scoped to `tenancy` since permissions here are not cross-cutting platform concerns). `TenantPermissionEnum` and the `TenantRoleEnum -> TenantPermissionEnum[]` mapping are pure domain data, so they live in `domain/enums/` next to the existing `TenantRoleEnum`. Alternative considered: put the mapping in `application/services/` as a lookup service — rejected, it has no dependencies and no orchestration role; a plain exported map/function is simpler and matches how the existing `TenantRoleEnum` is already just a plain enum.

### `requesterUserId` on commands stays as-is; the guard doesn't replace it
`UpdateTenantCommand`/`DeleteTenantCommand` already carry `requesterUserId`. This change does not repurpose that field for authorization — the guard rejects unauthorized requests before the command is even dispatched. `requesterUserId` keeps its existing role (handler-level bookkeeping). Avoids two competing authorization mechanisms.

### Guard resolves `tenantId` from a single convention: route param / GraphQL arg named `tenantId`
REST already uses `@Param('tenantId')` on every tenant-scoped route; GraphQL mutations take a `tenantId` input field. `TenantPermissionGuard` reads it the same way `JwtAuthGuard` reads the request across REST/GraphQL — via `ExecutionContext`, checking `request.params.tenantId` (REST) or the GraphQL args object (GraphQL) for a `tenantId` key. Alternative considered: a reflector-based metadata param name — rejected as unneeded complexity; every existing tenant-scoped endpoint already names it `tenantId` consistently.

### `@RequiresPermission(permission)` decorator + `TenantPermissionGuard`, applied per-endpoint
Mirrors `PlatformAdminGuard`'s shape (a `CanActivate` reading `request.user`) plus a `Reflector`-read metadata decorator (the established Nest pattern for parameterized guards, e.g. `@Roles()` in the Nest docs) to pass which permission each endpoint requires. `TenantPermissionGuard` must run after `JwtAuthGuard` (needs `request.user` populated), same ordering already required by `PlatformAdminGuard`.

## Risks / Trade-offs

- **[Risk] Stale role after a mid-session role change** — if a caller's role is changed by an admin, the caller's existing access token still carries the old role until it expires or is refreshed. → **Mitigation**: this is the same staleness class `platformAdmin` already has in this codebase (no existing mitigation for that either); acceptable given token lifetime is short-lived (see `auth` context's session/refresh design). Not a new problem introduced by this change.
- **[Risk] Breaking change for any client currently relying on non-member access to `updateTenant`/`deleteTenant`/`addTenantMember`** — flagged **BREAKING** in the proposal. → **Mitigation**: those calls were never a supported contract (the REST docs already claimed 403 for non-owners); no rollback path needed beyond reverting the guard.
- **[Risk] Future tenant-scoped queries (e.g. a later tenant-by-id read) won't automatically inherit `view_tenant` enforcement** — this change wires the guard explicitly onto today's tenant-scoped endpoints (`GET /tenants/:tenantId/members` / `tenantMembershipsFindByTenantId`); it's not a global interceptor. → **Mitigation**: `tasks.md` for this change covers every tenant-scoped endpoint that exists today; any new tenant-scoped endpoint added later must apply `@RequiresPermission()` itself — call this out in the updated `tenancy/README.md`.

## Migration Plan

1. Add `TenantPermissionEnum` + role→permission map, `TenantPermissionGuard`, `RequiresPermission` decorator, with unit tests — no behavior change yet (nothing wired).
2. Wire the guard onto `updateTenant`/`deleteTenant`/`addTenantMember` and the member-listing reads (`GET /tenants/:tenantId/members`, `tenantMembershipsFindByTenantId`) — REST controller + GraphQL resolvers — one endpoint at a time, each with its own commit, each covered by an E2E test asserting both the success and 403 paths.
3. Update `src/contexts/tenancy/README.md`.
4. Rollback: revert the wiring commit(s) for a given endpoint (drops the `@UseGuards`/`@RequiresPermission` decorators) — no schema or token change to unwind.

## Open Questions

- Should `PlatformAdminGuard`-holding callers (platform admins) bypass `TenantPermissionGuard` for support/ops purposes, or must a platform admin also hold a tenant membership to act on it? Doesn't change the specs or guard implementation — can be resolved as a follow-up `@UseGuards` ordering decision per endpoint.
