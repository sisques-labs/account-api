import { TenantPermissionEnum } from '@contexts/tenancy/domain/enums/tenant-permission.enum';
import {
  REQUIRES_TENANT_PERMISSION_KEY,
  RequiresTenantPermission,
} from '@sisques-labs/nestjs-kit/rbac';

/**
 * `tenancy`'s alias of the kit's generic `RequiresTenantPermission()`,
 * narrowed to this context's own `TenantPermissionEnum`. Read by
 * `TenantPermissionGuard` via `Reflector` — mirrors Nest's own `@Roles()`
 * cookbook pattern. Has no effect unless `TenantPermissionGuard` also runs
 * on the same handler (after `JwtAuthGuard`, which populates `request.user`).
 */
export const REQUIRES_PERMISSION_KEY = REQUIRES_TENANT_PERMISSION_KEY;

export const RequiresPermission =
  RequiresTenantPermission<TenantPermissionEnum>;
