import { StringValueObject } from '@sisques-labs/nestjs-kit';

export class TenantNameValueObject extends StringValueObject {
  constructor(value: string) {
    super(value, { minLength: 1, maxLength: 150, trim: true });
  }
}
