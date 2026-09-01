/**
 * Whitelist of `Tenant` fields a client can filter/sort by via
 * `tenantsFindByCriteria`. Transport-only — not a domain concept, so it lives
 * here rather than in `domain/enums/`.
 *
 * Covers every scalar/FK field on `TenantViewModel` that maps to a real
 * column on the `tenants` table.
 */
export enum TenantQueryableField {
  ID = 'id',
  APP_ID = 'appId',
  NAME = 'name',
  SLUG = 'slug',
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
}
