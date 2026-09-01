import { AppNotFoundException } from '@contexts/app/domain/exceptions/app-not-found.exception';
import { AppSlugAlreadyExistsException } from '@contexts/app/domain/exceptions/app-slug-already-exists.exception';
import { HttpStatus } from '@nestjs/common';
import { BaseException } from '@sisques-labs/nestjs-kit';

/** Registered in `src/core/filters/base-exception.filter.ts`. */
export function resolveAppExceptionStatus(
  exception: BaseException,
): number | undefined {
  if (exception instanceof AppSlugAlreadyExistsException) {
    return HttpStatus.CONFLICT;
  }
  if (exception instanceof AppNotFoundException) {
    return HttpStatus.NOT_FOUND;
  }
  return undefined;
}
