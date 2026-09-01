import { LoginPasswordValueObject } from '@contexts/auth/domain/value-objects/login-password/login-password.vo';
import { EmailValueObject } from '@sisques-labs/nestjs-kit';

export interface LoginUserCommandInput {
  email: string;
  password: string;
}

export class LoginUserCommand {
  public readonly email: EmailValueObject;
  public readonly password: LoginPasswordValueObject;

  constructor(input: LoginUserCommandInput) {
    this.email = new EmailValueObject(input.email);
    this.password = new LoginPasswordValueObject(input.password);
  }
}
