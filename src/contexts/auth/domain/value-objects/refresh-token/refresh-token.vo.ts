import { StringValueObject } from '@sisques-labs/nestjs-kit';

/** Raw opaque refresh token, as received from the client. */
export class RefreshTokenValueObject extends StringValueObject {
  constructor(value: string) {
    super(value, { minLength: 1 });
  }
}
