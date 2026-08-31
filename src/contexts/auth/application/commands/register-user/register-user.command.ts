import {
  EmailValueObject,
  PasswordValueObject,
  StringValueObject,
} from '@sisques-labs/nestjs-kit';

export interface RegisterUserCommandInput {
  email: string;
  password: string;
  displayName?: string;
}

export class RegisterUserCommand {
  public readonly email: EmailValueObject;
  public readonly password: PasswordValueObject;
  public readonly displayName?: StringValueObject;

  constructor(input: RegisterUserCommandInput) {
    this.email = new EmailValueObject(input.email);
    this.password = new PasswordValueObject(input.password);
    this.displayName =
      input.displayName !== undefined
        ? new StringValueObject(input.displayName, {
            minLength: 1,
            maxLength: 120,
            trim: true,
          })
        : undefined;
  }
}
