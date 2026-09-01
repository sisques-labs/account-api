import { EmailAlreadyRegisteredException } from '@contexts/auth/domain/exceptions/email-already-registered.exception';
import { InvalidCredentialsException } from '@contexts/auth/domain/exceptions/invalid-credentials.exception';
import { InvalidRefreshTokenException } from '@contexts/auth/domain/exceptions/invalid-refresh-token.exception';
import { HttpStatus } from '@nestjs/common';
import { BaseException } from '@sisques-labs/nestjs-kit';

import { resolveAuthExceptionStatus } from './auth-exception.filter';

class SomeOtherException extends BaseException {
  constructor() {
    super('unrelated');
  }
}

describe('resolveAuthExceptionStatus', () => {
  it('should map EmailAlreadyRegisteredException to 409', () => {
    expect(
      resolveAuthExceptionStatus(
        new EmailAlreadyRegisteredException('a@example.com'),
      ),
    ).toBe(HttpStatus.CONFLICT);
  });

  it('should map InvalidCredentialsException to 401', () => {
    expect(resolveAuthExceptionStatus(new InvalidCredentialsException())).toBe(
      HttpStatus.UNAUTHORIZED,
    );
  });

  it('should map InvalidRefreshTokenException to 401', () => {
    expect(resolveAuthExceptionStatus(new InvalidRefreshTokenException())).toBe(
      HttpStatus.UNAUTHORIZED,
    );
  });

  it('should return undefined for an exception it does not recognize', () => {
    expect(
      resolveAuthExceptionStatus(new SomeOtherException()),
    ).toBeUndefined();
  });
});
