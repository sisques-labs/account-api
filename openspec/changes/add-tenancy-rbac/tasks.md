## 1. Domain: permission model

- [ ] 1.1 Add `TenantPermissionEnum` (`VIEW_TENANT`, `MANAGE_TENANT`, `DELETE_TENANT`, `MANAGE_MEMBERS`) at `src/contexts/tenancy/domain/enums/tenant-permission.enum.ts` and verify it compiles and is exported.
- [ ] 1.2 Add the `TenantRoleEnum -> TenantPermissionEnum[]` mapping (OWNER: all four; ADMIN: `VIEW_TENANT`, `MANAGE_TENANT`, `MANAGE_MEMBERS`; MEMBER: `VIEW_TENANT` only) alongside the enum, plus a co-located `.spec.ts` asserting every `TenantRoleEnum` value has a mapping entry and the OWNER/ADMIN/MEMBER permission sets match the spec's "Tenant permission model" scenarios exactly. Verify with `pnpm test`.

## 2. Infrastructure: guard + decorator

- [ ] 2.1 Add `RequiresPermission(permission: TenantPermissionEnum)` metadata decorator at `src/contexts/tenancy/infrastructure/decorators/requires-permission.decorator.ts` (Reflector-based, mirrors Nest's `@Roles()` pattern) with a unit test asserting it sets the expected reflected metadata.
- [ ] 2.2 Add `TenantPermissionGuard` at `src/contexts/tenancy/infrastructure/guards/tenant-permission.guard.ts`: reads the required permission via `Reflector`, extracts `tenantId` from REST `request.params` or GraphQL args (same dual-context handling as `JwtAuthGuard`), finds the caller's role in `request.user.tenants`, and checks it against the role→permission map from task 1.2. Throws `ForbiddenException` when the caller has no membership for that tenant or the role lacks the permission; returns `true` otherwise.
- [ ] 2.3 Unit-test `TenantPermissionGuard` (`jest.Mocked<Reflector>`, no `@nestjs/testing`) covering: caller with sufficient role passes; caller with insufficient role is rejected; caller with no membership for the tenant is rejected; a caller who is a member of a *different* tenant is rejected (per the spec's "Member of a different tenant is rejected" scenario). Verify with `pnpm test`.

## 3. Wire REST endpoints

- [ ] 3.1 Apply `@UseGuards(JwtAuthGuard, TenantPermissionGuard)` + `@RequiresPermission(TenantPermissionEnum.MANAGE_TENANT)` to `TenantsController.update` (`PATCH /tenants/:tenantId`).
- [ ] 3.2 Apply `@RequiresPermission(TenantPermissionEnum.DELETE_TENANT)` to `TenantsController.remove` (`DELETE /tenants/:tenantId`).
- [ ] 3.3 Apply `@RequiresPermission(TenantPermissionEnum.MANAGE_MEMBERS)` to `TenantsController.addMember` (`POST /tenants/:tenantId/members`).
- [ ] 3.4 Apply `@RequiresPermission(TenantPermissionEnum.VIEW_TENANT)` to `TenantsController.listMembers` (`GET /tenants/:tenantId/members`).
- [ ] 3.5 Update the REST controller's `@ApiResponse({status: 403, ...})` docs on these four methods to match actual enforced behavior (they currently describe "owner only", which is no longer accurate for admin-permitted actions). Verify by re-reading the generated Swagger doc.

## 4. Wire GraphQL endpoints

- [ ] 4.1 Apply the same guard + `@RequiresPermission(MANAGE_TENANT)` to the `updateTenant` mutation in `tenant-mutations.resolver.ts`.
- [ ] 4.2 Apply `@RequiresPermission(DELETE_TENANT)` to the `deleteTenant` mutation.
- [ ] 4.3 Apply `@RequiresPermission(MANAGE_MEMBERS)` to the `addTenantMember` mutation.
- [ ] 4.4 Apply `@RequiresPermission(VIEW_TENANT)` to the `tenantMembershipsFindByTenantId` query in `tenant-queries.resolver.ts` (currently has no guard at all beyond the resolver-level `@UseGuards(JwtAuthGuard)`).

## 5. E2E coverage

- [ ] 5.1 Add `test/*.e2e-spec.ts` cases for each of the 4 REST endpoints: a sufficient-role member succeeds, an insufficient-role member gets 403, and a non-member gets 403. Verify with `pnpm test:e2e`.
- [ ] 5.2 Add equivalent E2E cases for the 4 GraphQL operations (`updateTenant`, `deleteTenant`, `addTenantMember`, `tenantMembershipsFindByTenantId`). Verify with `pnpm test:e2e`.
- [ ] 5.3 Note in the PR description that no `test/integration/*.integration-spec.ts` layer is added for this change — `TenantPermissionGuard` has no persistence boundary (reads only `request.user` from the JWT already verified by `JwtAuthGuard`), so there is nothing DB-backed to integration-test beyond what the E2E suite already covers.

## 6. Documentation

- [ ] 6.1 Update `src/contexts/tenancy/README.md`: document `TenantPermissionEnum`, the role→permission mapping, the `TenantPermissionGuard`/`RequiresPermission` pair, and the note that any future tenant-scoped endpoint must apply the guard itself (per design.md's risk on non-automatic enforcement). Verify the README reflects the context's current state, not just this change's delta, per the project's apply rules.
