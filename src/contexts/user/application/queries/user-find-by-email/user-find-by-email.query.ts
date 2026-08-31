import { UserEmailValueObject } from '@contexts/user/domain/value-objects/user-email/user-email.vo';

export interface UserFindByEmailQueryInput {
  email: string;
}

export class UserFindByEmailQuery {
  public readonly email: UserEmailValueObject;

  constructor(input: UserFindByEmailQueryInput) {
    this.email = new UserEmailValueObject(input.email);
  }
}
