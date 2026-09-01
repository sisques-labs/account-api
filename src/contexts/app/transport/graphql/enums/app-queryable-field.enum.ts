/**
 * Whitelist of `App` fields a client can filter/sort by via
 * `appsFindByCriteria`. Transport-only — not a domain concept, so it lives
 * here rather than in `domain/enums/`.
 *
 * Covers every scalar field on `AppViewModel` that maps to a real column on
 * the `apps` table.
 */
export enum AppQueryableField {
  ID = 'id',
  SLUG = 'slug',
  NAME = 'name',
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
}
