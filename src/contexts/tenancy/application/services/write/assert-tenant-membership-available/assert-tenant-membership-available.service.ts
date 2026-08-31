import { TenantMembershipAlreadyExistsException } from '@contexts/tenancy/domain/exceptions/tenant-membership-already-exists.exception';
import {
  ITenantMembershipWriteRepository,
  TENANT_MEMBERSHIP_WRITE_REPOSITORY,
} from '@contexts/tenancy/domain/repositories/write/tenant-membership-write.repository';
import { Inject, Injectable } from '@nestjs/common';
import { UuidValueObject } from '@sisques-labs/nestjs-kit';

/**
 * Not `IBaseService` — that interface is single-input, and this assertion
 * inherently needs two (tenantId + userId).
 */
@Injectable()
export class AssertTenantMembershipAvailableService {
  constructor(
    @Inject(TENANT_MEMBERSHIP_WRITE_REPOSITORY)
    private readonly tenantMembershipWriteRepository: ITenantMembershipWriteRepository,
  ) {}

  async execute(
    tenantId: UuidValueObject,
    userId: UuidValueObject,
  ): Promise<void> {
    const existing =
      await this.tenantMembershipWriteRepository.findByTenantIdAndUserId(
        tenantId.value,
        userId.value,
      );
    if (existing) {
      throw new TenantMembershipAlreadyExistsException(
        tenantId.value,
        userId.value,
      );
    }
  }
}
