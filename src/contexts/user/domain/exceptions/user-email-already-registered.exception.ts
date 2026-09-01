import { BaseException } from '@sisques-labs/nestjs-kit';

export class UserEmailAlreadyRegisteredException extends BaseException {
  constructor(email: string) {
    super(`A user with email "${email}" is already registered`);
  }
}
