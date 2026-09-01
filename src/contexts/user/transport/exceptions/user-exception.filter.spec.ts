import { UserEmailAlreadyRegisteredException } from '@contexts/user/domain/exceptions/user-email-already-registered.exception';
import { UserNotFoundException } from '@contexts/user/domain/exceptions/user-not-found.exception';
import { HttpStatus } from '@nestjs/common';
import { BaseException } from '@sisques-labs/nestjs-kit';

import { resolveUserExceptionStatus } from './user-exception.filter';

class SomeOtherException extends BaseException {
  constructor() {
    super('unrelated');
  }
}

describe('resolveUserExceptionStatus', () => {
  it('should map UserEmailAlreadyRegisteredException to 409', () => {
    expect(
      resolveUserExceptionStatus(
        new UserEmailAlreadyRegisteredException('a@example.com'),
      ),
    ).toBe(HttpStatus.CONFLICT);
  });

  it('should map UserNotFoundException to 404', () => {
    expect(resolveUserExceptionStatus(new UserNotFoundException('id-1'))).toBe(
      HttpStatus.NOT_FOUND,
    );
  });

  it('should return undefined for an exception it does not recognize', () => {
    expect(
      resolveUserExceptionStatus(new SomeOtherException()),
    ).toBeUndefined();
  });
});
