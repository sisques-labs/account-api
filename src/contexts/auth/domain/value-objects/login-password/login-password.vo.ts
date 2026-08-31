import { StringValueObject } from '@sisques-labs/nestjs-kit';

/**
 * The raw password submitted at login. Deliberately NOT the stricter
 * `PasswordValueObject` (used only at registration) — login must still
 * accept a pre-existing password even if it wouldn't pass today's policy.
 */
export class LoginPasswordValueObject extends StringValueObject {
  constructor(value: string) {
    super(value, { minLength: 1, allowEmpty: false });
  }
}
