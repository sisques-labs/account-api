import { TenantPermissionEnum } from '@contexts/tenancy/domain/enums/tenant-permission.enum';
import { TenantRoleEnum } from '@contexts/tenancy/domain/enums/tenant-role.enum';

/**
 * Default, code-defined `TenantRoleEnum -> TenantPermissionEnum[]` mapping.
 * Fixed for this change — no admin UI/API to customize it per tenant (see
 * `design.md`, "Non-Goals").
 */
export const TENANT_ROLE_PERMISSIONS: Record<
  TenantRoleEnum,
  TenantPermissionEnum[]
> = {
  [TenantRoleEnum.OWNER]: [
    TenantPermissionEnum.VIEW_TENANT,
    TenantPermissionEnum.MANAGE_TENANT,
    TenantPermissionEnum.DELETE_TENANT,
    TenantPermissionEnum.MANAGE_MEMBERS,
  ],
  [TenantRoleEnum.ADMIN]: [
    TenantPermissionEnum.VIEW_TENANT,
    TenantPermissionEnum.MANAGE_TENANT,
    TenantPermissionEnum.MANAGE_MEMBERS,
  ],
  [TenantRoleEnum.MEMBER]: [TenantPermissionEnum.VIEW_TENANT],
};
