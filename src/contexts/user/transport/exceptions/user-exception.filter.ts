import { UserEmailAlreadyRegisteredException } from '@contexts/user/domain/exceptions/user-email-already-registered.exception';
import { UserNotFoundException } from '@contexts/user/domain/exceptions/user-not-found.exception';
import { HttpStatus } from '@nestjs/common';
import { BaseException } from '@sisques-labs/nestjs-kit';

/** Registered in `src/core/filters/base-exception.filter.ts`. */
export function resolveUserExceptionStatus(
  exception: BaseException,
): number | undefined {
  if (exception instanceof UserEmailAlreadyRegisteredException) {
    return HttpStatus.CONFLICT;
  }
  if (exception instanceof UserNotFoundException) {
    return HttpStatus.NOT_FOUND;
  }
  return undefined;
}
