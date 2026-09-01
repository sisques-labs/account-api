import { EmailAlreadyRegisteredException } from '@contexts/auth/domain/exceptions/email-already-registered.exception';
import { InvalidCredentialsException } from '@contexts/auth/domain/exceptions/invalid-credentials.exception';
import { InvalidRefreshTokenException } from '@contexts/auth/domain/exceptions/invalid-refresh-token.exception';
import { HttpStatus } from '@nestjs/common';
import { BaseException } from '@sisques-labs/nestjs-kit';

/** Registered in `src/core/filters/base-exception.filter.ts`. */
export function resolveAuthExceptionStatus(
  exception: BaseException,
): number | undefined {
  if (exception instanceof EmailAlreadyRegisteredException) {
    return HttpStatus.CONFLICT;
  }
  if (
    exception instanceof InvalidCredentialsException ||
    exception instanceof InvalidRefreshTokenException
  ) {
    return HttpStatus.UNAUTHORIZED;
  }
  return undefined;
}
