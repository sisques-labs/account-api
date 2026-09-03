import { BaseException } from '@sisques-labs/nestjs-kit';

export class UserNotFoundException extends BaseException {
  constructor(identifier: string) {
    super(`User "${identifier}" was not found`);
  }
}
