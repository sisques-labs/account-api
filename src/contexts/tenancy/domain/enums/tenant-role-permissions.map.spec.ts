import { TenantPermissionEnum } from '@contexts/tenancy/domain/enums/tenant-permission.enum';
import { TenantRoleEnum } from '@contexts/tenancy/domain/enums/tenant-role.enum';

import { TENANT_ROLE_PERMISSIONS } from './tenant-role-permissions.map';

describe('TENANT_ROLE_PERMISSIONS', () => {
  it('has a mapping entry for every TenantRoleEnum value', () => {
    for (const role of Object.values(TenantRoleEnum)) {
      expect(TENANT_ROLE_PERMISSIONS[role]).toBeDefined();
    }
  });

  it('grants OWNER every permission', () => {
    expect(new Set(TENANT_ROLE_PERMISSIONS[TenantRoleEnum.OWNER])).toEqual(
      new Set([
        TenantPermissionEnum.VIEW_TENANT,
        TenantPermissionEnum.MANAGE_TENANT,
        TenantPermissionEnum.DELETE_TENANT,
        TenantPermissionEnum.MANAGE_MEMBERS,
      ]),
    );
  });

  it('grants ADMIN view, manage, and manage-members but not delete', () => {
    expect(new Set(TENANT_ROLE_PERMISSIONS[TenantRoleEnum.ADMIN])).toEqual(
      new Set([
        TenantPermissionEnum.VIEW_TENANT,
        TenantPermissionEnum.MANAGE_TENANT,
        TenantPermissionEnum.MANAGE_MEMBERS,
      ]),
    );
    expect(TENANT_ROLE_PERMISSIONS[TenantRoleEnum.ADMIN]).not.toContain(
      TenantPermissionEnum.DELETE_TENANT,
    );
  });

  it('grants MEMBER only the view permission', () => {
    expect(TENANT_ROLE_PERMISSIONS[TenantRoleEnum.MEMBER]).toEqual([
      TenantPermissionEnum.VIEW_TENANT,
    ]);
  });
});
