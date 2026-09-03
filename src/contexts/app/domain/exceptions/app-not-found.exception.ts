import { BaseException } from '@sisques-labs/nestjs-kit';

export class AppNotFoundException extends BaseException {
  constructor(identifier: string) {
    super(`App "${identifier}" was not found`);
  }
}
