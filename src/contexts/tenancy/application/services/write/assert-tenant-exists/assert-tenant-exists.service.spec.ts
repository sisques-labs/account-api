import { TenantAggregate } from '@contexts/tenancy/domain/aggregates/tenant/tenant.aggregate';
import { TenantNotFoundException } from '@contexts/tenancy/domain/exceptions/tenant/tenant-not-found.exception';
import { ITenantWriteRepository } from '@contexts/tenancy/domain/repositories/write/tenant-write.repository';
import { UuidValueObject } from '@sisques-labs/nestjs-kit';

import { AssertTenantExistsService } from './assert-tenant-exists.service';

describe('AssertTenantExistsService', () => {
  let service: AssertTenantExistsService;
  let tenantWriteRepository: jest.Mocked<ITenantWriteRepository>;

  beforeEach(() => {
    tenantWriteRepository = {
      findByAppIdAndSlug: jest.fn(),
      findById: jest.fn(),
      findByCriteria: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };
    service = new AssertTenantExistsService(tenantWriteRepository);
  });

  it('should return the tenant when found', async () => {
    const tenant = {} as unknown as TenantAggregate;
    tenantWriteRepository.findById.mockResolvedValue(tenant);

    await expect(service.execute(UuidValueObject.generate())).resolves.toBe(
      tenant,
    );
  });

  it('should throw TenantNotFoundException when not found', async () => {
    tenantWriteRepository.findById.mockResolvedValue(null);

    await expect(service.execute(UuidValueObject.generate())).rejects.toThrow(
      TenantNotFoundException,
    );
  });
});
