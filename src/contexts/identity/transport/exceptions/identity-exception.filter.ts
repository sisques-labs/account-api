import { InvalidCredentialsException } from '@contexts/identity/domain/exceptions/invalid-credentials.exception';
import { InvalidRefreshTokenException } from '@contexts/identity/domain/exceptions/invalid-refresh-token.exception';
import { UserEmailAlreadyRegisteredException } from '@contexts/identity/domain/exceptions/user-email-already-registered.exception';
import { UserNotFoundException } from '@contexts/identity/domain/exceptions/user-not-found.exception';
import { HttpStatus } from '@nestjs/common';
import { BaseException } from '@sisques-labs/nestjs-kit';

/** Registered in `src/core/filters/base-exception.filter.ts`. */
export function resolveIdentityExceptionStatus(
  exception: BaseException,
): number | undefined {
  if (exception instanceof UserEmailAlreadyRegisteredException) {
    return HttpStatus.CONFLICT;
  }
  if (exception instanceof UserNotFoundException) {
    return HttpStatus.NOT_FOUND;
  }
  if (
    exception instanceof InvalidCredentialsException ||
    exception instanceof InvalidRefreshTokenException
  ) {
    return HttpStatus.UNAUTHORIZED;
  }
  return undefined;
}
