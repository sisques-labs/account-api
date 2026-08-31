import { TenantMembershipAggregate } from '@contexts/tenancy/domain/aggregates/tenant-membership/tenant-membership.aggregate';
import { NotTenantOwnerException } from '@contexts/tenancy/domain/exceptions/tenant/not-tenant-owner.exception';
import { TenantRoleEnum } from '@contexts/tenancy/domain/enums/tenant-role.enum';
import { ITenantMembershipWriteRepository } from '@contexts/tenancy/domain/repositories/write/tenant-membership-write.repository';
import { TenantRoleValueObject } from '@contexts/tenancy/domain/value-objects/tenant-role/tenant-role.vo';
import { UuidValueObject } from '@sisques-labs/nestjs-kit';

import { AssertTenantOwnerService } from './assert-tenant-owner.service';

describe('AssertTenantOwnerService', () => {
  let service: AssertTenantOwnerService;
  let tenantMembershipWriteRepository: jest.Mocked<ITenantMembershipWriteRepository>;

  beforeEach(() => {
    tenantMembershipWriteRepository = {
      findByTenantIdAndUserId: jest.fn(),
      findById: jest.fn(),
      findByCriteria: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      deleteAllByTenantId: jest.fn(),
    };
    service = new AssertTenantOwnerService(tenantMembershipWriteRepository);
  });

  it('should resolve when the user is an owner of the tenant', async () => {
    tenantMembershipWriteRepository.findByTenantIdAndUserId.mockResolvedValue({
      role: new TenantRoleValueObject(TenantRoleEnum.OWNER),
    } as unknown as TenantMembershipAggregate);

    await expect(
      service.execute(UuidValueObject.generate(), UuidValueObject.generate()),
    ).resolves.toBeUndefined();
  });

  it('should throw NotTenantOwnerException when the user is not a member', async () => {
    tenantMembershipWriteRepository.findByTenantIdAndUserId.mockResolvedValue(
      null,
    );

    await expect(
      service.execute(UuidValueObject.generate(), UuidValueObject.generate()),
    ).rejects.toThrow(NotTenantOwnerException);
  });

  it('should throw NotTenantOwnerException when the user is a member but not an owner', async () => {
    tenantMembershipWriteRepository.findByTenantIdAndUserId.mockResolvedValue({
      role: new TenantRoleValueObject(TenantRoleEnum.MEMBER),
    } as unknown as TenantMembershipAggregate);

    await expect(
      service.execute(UuidValueObject.generate(), UuidValueObject.generate()),
    ).rejects.toThrow(NotTenantOwnerException);
  });
});
