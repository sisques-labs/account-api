export const USER_PLATFORM_ADMIN_PORT = Symbol('USER_PLATFORM_ADMIN_PORT');

/**
 * Cross-context port into the `user` context — reconciles a user's
 * `platformAdmin` flag from `auth`'s `LoginUserCommandHandler`.
 * `UserAggregate.changePlatformAdmin()` is private and reachable only via
 * `update()`, so this port's implementation (`UserPlatformAdminAdapter`)
 * dispatches the public `SetUserPlatformAdminCommand` via `CommandBus`.
 * Never import `@contexts/user` directly outside `infrastructure/adapters/`.
 */
export interface IUserPlatformAdminPort {
  setPlatformAdmin(userId: string, platformAdmin: boolean): Promise<void>;
}
