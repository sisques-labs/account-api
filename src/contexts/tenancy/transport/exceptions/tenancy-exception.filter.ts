import { MemberUserNotFoundException } from '@contexts/tenancy/domain/exceptions/member-user-not-found.exception';
import { TenantMembershipAlreadyExistsException } from '@contexts/tenancy/domain/exceptions/tenant-membership-already-exists.exception';
import { TenantNotFoundException } from '@contexts/tenancy/domain/exceptions/tenant-not-found.exception';
import { TenantSlugAlreadyExistsException } from '@contexts/tenancy/domain/exceptions/tenant-slug-already-exists.exception';
import { HttpStatus } from '@nestjs/common';
import { BaseException } from '@sisques-labs/nestjs-kit';

/** Registered in `src/core/filters/base-exception.filter.ts`. */
export function resolveTenancyExceptionStatus(
  exception: BaseException,
): number | undefined {
  if (
    exception instanceof TenantSlugAlreadyExistsException ||
    exception instanceof TenantMembershipAlreadyExistsException
  ) {
    return HttpStatus.CONFLICT;
  }
  if (
    exception instanceof TenantNotFoundException ||
    exception instanceof MemberUserNotFoundException
  ) {
    return HttpStatus.NOT_FOUND;
  }
  return undefined;
}
