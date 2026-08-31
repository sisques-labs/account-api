import { InvalidCredentialsException } from '@contexts/identity/domain/exceptions/invalid-credentials.exception';
import { InvalidRefreshTokenException } from '@contexts/identity/domain/exceptions/invalid-refresh-token.exception';
import { UserEmailAlreadyRegisteredException } from '@contexts/identity/domain/exceptions/user-email-already-registered.exception';
import { UserNotFoundException } from '@contexts/identity/domain/exceptions/user-not-found.exception';
import { HttpStatus } from '@nestjs/common';
import { BaseException } from '@sisques-labs/nestjs-kit';

import { resolveIdentityExceptionStatus } from './identity-exception.filter';

class SomeOtherException extends BaseException {
  constructor() {
    super('unrelated');
  }
}

describe('resolveIdentityExceptionStatus', () => {
  it('should map UserEmailAlreadyRegisteredException to 409', () => {
    expect(
      resolveIdentityExceptionStatus(
        new UserEmailAlreadyRegisteredException('a@example.com'),
      ),
    ).toBe(HttpStatus.CONFLICT);
  });

  it('should map UserNotFoundException to 404', () => {
    expect(
      resolveIdentityExceptionStatus(new UserNotFoundException('id-1')),
    ).toBe(HttpStatus.NOT_FOUND);
  });

  it('should map InvalidCredentialsException to 401', () => {
    expect(
      resolveIdentityExceptionStatus(new InvalidCredentialsException()),
    ).toBe(HttpStatus.UNAUTHORIZED);
  });

  it('should map InvalidRefreshTokenException to 401', () => {
    expect(
      resolveIdentityExceptionStatus(new InvalidRefreshTokenException()),
    ).toBe(HttpStatus.UNAUTHORIZED);
  });

  it('should return undefined for an exception it does not recognize', () => {
    expect(
      resolveIdentityExceptionStatus(new SomeOtherException()),
    ).toBeUndefined();
  });
});
