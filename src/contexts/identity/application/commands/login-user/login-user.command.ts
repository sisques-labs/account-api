import { LoginPasswordValueObject } from '@contexts/identity/domain/value-objects/login-password/login-password.vo';
import { UserEmailValueObject } from '@contexts/identity/domain/value-objects/user-email/user-email.vo';

export interface LoginUserCommandInput {
  email: string;
  password: string;
}

export class LoginUserCommand {
  public readonly email: UserEmailValueObject;
  public readonly password: LoginPasswordValueObject;

  constructor(input: LoginUserCommandInput) {
    this.email = new UserEmailValueObject(input.email);
    this.password = new LoginPasswordValueObject(input.password);
  }
}
