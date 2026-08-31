import { AppNotFoundException } from '@contexts/app/domain/exceptions/app-not-found.exception';
import { AppSlugAlreadyExistsException } from '@contexts/app/domain/exceptions/app-slug-already-exists.exception';
import { HttpStatus } from '@nestjs/common';
import { BaseException } from '@sisques-labs/nestjs-kit';

import { resolveAppExceptionStatus } from './app-exception.filter';

class SomeOtherException extends BaseException {
  constructor() {
    super('unrelated');
  }
}

describe('resolveAppExceptionStatus', () => {
  it('should map AppSlugAlreadyExistsException to 409', () => {
    expect(
      resolveAppExceptionStatus(new AppSlugAlreadyExistsException('x')),
    ).toBe(HttpStatus.CONFLICT);
  });

  it('should map AppNotFoundException to 404', () => {
    expect(resolveAppExceptionStatus(new AppNotFoundException('x'))).toBe(
      HttpStatus.NOT_FOUND,
    );
  });

  it('should return undefined for an exception it does not recognize', () => {
    expect(resolveAppExceptionStatus(new SomeOtherException())).toBeUndefined();
  });
});
