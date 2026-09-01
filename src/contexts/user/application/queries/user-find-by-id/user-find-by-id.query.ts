import { UserIdValueObject } from '@contexts/user/domain/value-objects/user-id/user-id.vo';

export interface UserFindByIdQueryInput {
  userId: string;
}

/**
 * Consumed cross-context by `auth`'s `UserLookupAdapter` — refresh only has
 * the `userId` from a `SessionAggregate`, not an email, so it needs a
 * find-by-id path to re-fetch `email`/`platformAdmin` for the new JWT.
 */
export class UserFindByIdQuery {
  public readonly userId: UserIdValueObject;

  constructor(input: UserFindByIdQueryInput) {
    this.userId = new UserIdValueObject(input.userId);
  }
}
