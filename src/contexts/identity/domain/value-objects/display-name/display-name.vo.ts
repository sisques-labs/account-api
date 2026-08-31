import { StringValueObject } from '@sisques-labs/nestjs-kit';

export class DisplayNameValueObject extends StringValueObject {
  constructor(value: string) {
    super(value, { minLength: 1, maxLength: 120, trim: true });
  }
}
