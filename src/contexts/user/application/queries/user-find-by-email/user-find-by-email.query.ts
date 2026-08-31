import { IUserPrimitives } from '@contexts/user/domain/primitives/user.primitives';
import { UserEmailValueObject } from '@contexts/user/domain/value-objects/user-email/user-email.vo';

export type UserFindByEmailQueryInput = Pick<IUserPrimitives, 'email'>;

export class UserFindByEmailQuery {
  public readonly email: UserEmailValueObject;

  constructor(input: UserFindByEmailQueryInput) {
    this.email = new UserEmailValueObject(input.email);
  }
}
