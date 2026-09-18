import { UserIdValueObject } from '@contexts/user/domain/value-objects/user-id/user-id.vo';
import { BooleanValueObject } from '@sisques-labs/nestjs-kit';

export interface SetUserPlatformAdminCommandInput {
  userId: string;
  platformAdmin: boolean;
}

/**
 * Public command exposed by the `user` context so `auth` can reconcile a
 * user's `platformAdmin` flag without reaching `UserAggregate.update()`
 * directly — `changePlatformAdmin()` is private and only reachable through
 * `update()`. Dispatched cross-context by `auth`'s `UserPlatformAdminAdapter`
 * (via `CommandBus`), mirroring `CreateUserCommand`/`UserProvisioningAdapter`.
 */
export class SetUserPlatformAdminCommand {
  public readonly userId: UserIdValueObject;
  public readonly platformAdmin: BooleanValueObject;

  constructor(input: SetUserPlatformAdminCommandInput) {
    this.userId = new UserIdValueObject(input.userId);
    this.platformAdmin = new BooleanValueObject(input.platformAdmin);
  }
}
