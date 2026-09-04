import { TenantPermissionEnum } from '@contexts/tenancy/domain/enums/tenant-permission.enum';
import { SetMetadata } from '@nestjs/common';

export const REQUIRES_PERMISSION_KEY = 'requiresPermission';

/**
 * Marks a REST controller method or GraphQL resolver method with the
 * `TenantPermissionEnum` it requires. Read by `TenantPermissionGuard` via
 * `Reflector` — mirrors Nest's own `@Roles()` cookbook pattern. Has no
 * effect unless `TenantPermissionGuard` also runs on the same handler
 * (after `JwtAuthGuard`, which populates `request.user`).
 */
export const RequiresPermission = (
  permission: TenantPermissionEnum,
): MethodDecorator & ClassDecorator =>
  SetMetadata(REQUIRES_PERMISSION_KEY, permission);
