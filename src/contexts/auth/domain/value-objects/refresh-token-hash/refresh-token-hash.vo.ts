import { StringValueObject } from '@sisques-labs/nestjs-kit';

/** SHA-256 hex digest of an opaque refresh token. Never store the raw token. */
export class RefreshTokenHashValueObject extends StringValueObject {
  constructor(value: string) {
    super(value, { minLength: 64, maxLength: 64, pattern: /^[a-f0-9]{64}$/ });
  }
}
