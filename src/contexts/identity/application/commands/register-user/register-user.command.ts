import { DisplayNameValueObject } from '@contexts/identity/domain/value-objects/display-name/display-name.vo';
import { UserEmailValueObject } from '@contexts/identity/domain/value-objects/user-email/user-email.vo';
import { PasswordValueObject } from '@sisques-labs/nestjs-kit';

export interface RegisterUserCommandInput {
  email: string;
  password: string;
  displayName: string;
}

export class RegisterUserCommand {
  public readonly email: UserEmailValueObject;
  public readonly password: PasswordValueObject;
  public readonly displayName: DisplayNameValueObject;

  constructor(input: RegisterUserCommandInput) {
    this.email = new UserEmailValueObject(input.email);
    this.password = new PasswordValueObject(input.password);
    this.displayName = new DisplayNameValueObject(input.displayName);
  }
}
