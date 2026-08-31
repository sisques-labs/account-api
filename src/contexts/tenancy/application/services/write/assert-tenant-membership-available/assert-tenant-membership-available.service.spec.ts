import { TenantMembershipAggregate } from '@contexts/tenancy/domain/aggregates/tenant-membership.aggregate';
import { TenantMembershipAlreadyExistsException } from '@contexts/tenancy/domain/exceptions/tenant-membership-already-exists.exception';
import { ITenantMembershipWriteRepository } from '@contexts/tenancy/domain/repositories/write/tenant-membership-write.repository';
import { UuidValueObject } from '@sisques-labs/nestjs-kit';

import { AssertTenantMembershipAvailableService } from './assert-tenant-membership-available.service';

describe('AssertTenantMembershipAvailableService', () => {
  let service: AssertTenantMembershipAvailableService;
  let tenantMembershipWriteRepository: jest.Mocked<ITenantMembershipWriteRepository>;

  beforeEach(() => {
    tenantMembershipWriteRepository = {
      findByTenantIdAndUserId: jest.fn(),
      findById: jest.fn(),
      findByCriteria: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };
    service = new AssertTenantMembershipAvailableService(
      tenantMembershipWriteRepository,
    );
  });

  it('should resolve when the user is not yet a member', async () => {
    tenantMembershipWriteRepository.findByTenantIdAndUserId.mockResolvedValue(
      null,
    );

    await expect(
      service.execute(UuidValueObject.generate(), UuidValueObject.generate()),
    ).resolves.toBeUndefined();
  });

  it('should throw TenantMembershipAlreadyExistsException when already a member', async () => {
    tenantMembershipWriteRepository.findByTenantIdAndUserId.mockResolvedValue(
      {} as unknown as TenantMembershipAggregate,
    );

    await expect(
      service.execute(UuidValueObject.generate(), UuidValueObject.generate()),
    ).rejects.toThrow(TenantMembershipAlreadyExistsException);
  });
});
