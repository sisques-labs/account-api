/**
 * Generic, platform-level tenant permissions — layer 1 of the tenancy model
 * (see `tenancy/README.md`). Never app-specific semantics; what a permission
 * unlocks inside a given app is that app's own concern.
 */
export enum TenantPermissionEnum {
  VIEW_TENANT = 'VIEW_TENANT',
  MANAGE_TENANT = 'MANAGE_TENANT',
  DELETE_TENANT = 'DELETE_TENANT',
  MANAGE_MEMBERS = 'MANAGE_MEMBERS',
}
