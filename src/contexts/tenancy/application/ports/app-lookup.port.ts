export const APP_LOOKUP_PORT = Symbol('APP_LOOKUP_PORT');

/**
 * Cross-context port into the `app` context — verifies that an app exists
 * before creating a tenant scoped to it. Implemented by `AppLookupAdapter`,
 * which dispatches via QueryBus. Never import `@contexts/app` directly outside
 * `infrastructure/adapters/`.
 */
export interface IAppLookupPort {
  assertExists(id: string): Promise<void>;
}
