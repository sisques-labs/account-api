import { BaseException } from '@sisques-labs/nestjs-kit';

export class InvalidCredentialsException extends BaseException {
  constructor() {
    super('Invalid email or password');
  }
}
