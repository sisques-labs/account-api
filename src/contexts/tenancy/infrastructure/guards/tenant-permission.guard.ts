import { TenantPermissionEnum } from '@contexts/tenancy/domain/enums/tenant-permission.enum';
import { TENANT_ROLE_PERMISSIONS } from '@contexts/tenancy/domain/enums/tenant-role-permissions.map';
import { createTenantPermissionGuard } from '@sisques-labs/nestjs-kit/rbac';

/**
 * `tenancy`'s tenant-scoped permission guard, built from the shared
 * mechanism in `@sisques-labs/nestjs-kit/rbac` (reads the caller's role for
 * the target tenant from `request.user.tenants` — populated by
 * `JwtAuthGuard` from the JWT, the same way `PlatformAdminGuard` reads
 * `request.user.platformAdmin` — and compares it against a role map). The
 * permission enum and `TENANT_ROLE_PERMISSIONS` mapping stay local: what
 * each `TenantRole` grants is this context's own policy, not something the
 * kit defines. See `tenancy/README.md` ("Authorization: TenantPermissionGuard")
 * and the kit's README ("RBAC (Tenant Permissions)").
 */
export const TenantPermissionGuard =
  createTenantPermissionGuard<TenantPermissionEnum>({
    rolePermissions: TENANT_ROLE_PERMISSIONS,
  });
