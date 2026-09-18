## Why

`TenantMembership.role` is stored today but never interpreted: every tenancy mutation (`updateTenant`, `deleteTenant`, `addTenantMember`, …) is only gated by `JwtAuthGuard` — any authenticated user can mutate any tenant, whether or not they belong to it. As tenancy becomes the platform's real multi-tenant boundary, it needs permission checks scoped to the caller's membership and role in the specific tenant being acted on, not just "is logged in" or "is a platform admin".

## What Changes

- New `TenantPermission` enum — generic, platform-level permissions owned by `tenancy` layer 1 (e.g. `manage_tenant`, `delete_tenant`, `manage_members`, `view_tenant`), never app-specific semantics (layer 2 stays each app's concern, per the existing tenancy README split).
- Default role → permission mapping for the built-in `TenantRole`s (`owner`, `admin`, `member`), seeded in code (no new admin UI in this change).
- `@RequiresPermission(permission)` decorator + `TenantPermissionGuard` that resolves the caller's `TenantMembership` for the tenant in the request (path/arg `tenantId`), checks the role's permissions, and returns 403 (REST) / `ForbiddenException` (GraphQL) when missing.
- Wire the new guard onto every existing tenancy REST controller method and GraphQL resolver that mutates or reads a specific tenant's data — `updateTenant`, `deleteTenant`, `addTenantMember` (manage-tenant/delete-tenant/manage-members) **and** the member-listing reads, `GET /tenants/:tenantId/members` / `tenantMembershipsFindByTenantId` (view-tenant) — replacing the current "just `JwtAuthGuard`" behavior. **BREAKING**: authenticated users who are not members of a tenant (or lack the required role) will lose access to endpoints they could previously call.
- Update `src/contexts/tenancy/README.md` to document the permission model and the new guard/decorator.

## Capabilities

### New Capabilities
- `tenancy/rbac`: role-scoped permission enforcement for tenant-level mutations and queries — `TenantPermission` enum, role→permission mapping, `RequiresPermission` decorator, `TenantPermissionGuard`.

### Modified Capabilities
(none — no pre-existing `openspec/specs` capability covers tenancy access control yet; this is the first spec written for `tenancy`)

## Impact

- **Bounded contexts**: `tenancy` (owns the new guard, enum, and role mapping); `auth`/`user` unaffected (guard reads `TenantMembership`, not session/identity internals) — the guard is added under `tenancy`'s own `core/security`-style module, not `src/core/security`, since it's tenancy-specific authorization, unlike the platform-wide `JwtAuthGuard`/`PlatformAdminGuard`.
- **Code**: `src/contexts/tenancy/domain/enums/`, `application/services/` (or a new `authorization` sub-folder), `transport/rest/controllers/tenants.controller.ts`, `transport/graphql/resolvers/tenant/*`, plus new decorator/guard files.
- **API**: no new endpoints; existing `PATCH /tenants/:id`, `DELETE /tenants/:id`, `POST /tenants/:id/members`, `GET /tenants/:id/members`, `updateTenant`/`deleteTenant`/`addTenantMember`/`tenantMembershipsFindByTenantId` gain a 403 path they didn't have before.
- **Rollback plan**: the guard is additive middleware (`UseGuards`) — reverting is a single-commit revert removing the guard decorators from controllers/resolvers; no destructive schema change (permissions live in code, not a new table) makes rollback low-risk. If a `role_permission` DB table is introduced instead of a code-level map (see design.md), the migration must be additive and reversible (`down()` drops the table only).
