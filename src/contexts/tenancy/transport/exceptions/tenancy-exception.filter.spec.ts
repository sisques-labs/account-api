import { MemberUserNotFoundException } from '@contexts/tenancy/domain/exceptions/member-user-not-found.exception';
import { TenantMembershipAlreadyExistsException } from '@contexts/tenancy/domain/exceptions/tenant-membership-already-exists.exception';
import { TenantNotFoundException } from '@contexts/tenancy/domain/exceptions/tenant-not-found.exception';
import { TenantSlugAlreadyExistsException } from '@contexts/tenancy/domain/exceptions/tenant-slug-already-exists.exception';
import { HttpStatus } from '@nestjs/common';
import { BaseException } from '@sisques-labs/nestjs-kit';

import { resolveTenancyExceptionStatus } from './tenancy-exception.filter';

class SomeOtherException extends BaseException {
  constructor() {
    super('unrelated');
  }
}

describe('resolveTenancyExceptionStatus', () => {
  it('should map TenantSlugAlreadyExistsException to 409', () => {
    expect(
      resolveTenancyExceptionStatus(
        new TenantSlugAlreadyExistsException('x', 'app-1'),
      ),
    ).toBe(HttpStatus.CONFLICT);
  });

  it('should map TenantMembershipAlreadyExistsException to 409', () => {
    expect(
      resolveTenancyExceptionStatus(
        new TenantMembershipAlreadyExistsException('tenant-1', 'user-1'),
      ),
    ).toBe(HttpStatus.CONFLICT);
  });

  it('should map TenantNotFoundException to 404', () => {
    expect(
      resolveTenancyExceptionStatus(new TenantNotFoundException('x')),
    ).toBe(HttpStatus.NOT_FOUND);
  });

  it('should map MemberUserNotFoundException to 404', () => {
    expect(
      resolveTenancyExceptionStatus(new MemberUserNotFoundException('x')),
    ).toBe(HttpStatus.NOT_FOUND);
  });

  it('should return undefined for an exception it does not recognize', () => {
    expect(
      resolveTenancyExceptionStatus(new SomeOtherException()),
    ).toBeUndefined();
  });
});
