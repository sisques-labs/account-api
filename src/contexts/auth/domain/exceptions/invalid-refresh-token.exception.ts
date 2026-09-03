import { BaseException } from '@sisques-labs/nestjs-kit';

export class InvalidRefreshTokenException extends BaseException {
  constructor() {
    super('Refresh token is invalid, expired, or already used');
  }
}
