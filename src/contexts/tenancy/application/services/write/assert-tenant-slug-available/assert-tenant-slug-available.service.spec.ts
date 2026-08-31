import { TenantAggregate } from '@contexts/tenancy/domain/aggregates/tenant/tenant.aggregate';
import { TenantSlugAlreadyExistsException } from '@contexts/tenancy/domain/exceptions/tenant-slug-already-exists.exception';
import { ITenantWriteRepository } from '@contexts/tenancy/domain/repositories/write/tenant-write.repository';
import { TenantSlugValueObject } from '@contexts/tenancy/domain/value-objects/tenant-slug/tenant-slug.vo';
import { UuidValueObject } from '@sisques-labs/nestjs-kit';

import { AssertTenantSlugAvailableService } from './assert-tenant-slug-available.service';

describe('AssertTenantSlugAvailableService', () => {
  let service: AssertTenantSlugAvailableService;
  let tenantWriteRepository: jest.Mocked<ITenantWriteRepository>;

  beforeEach(() => {
    tenantWriteRepository = {
      findByAppIdAndSlug: jest.fn(),
      findById: jest.fn(),
      findByCriteria: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };
    service = new AssertTenantSlugAvailableService(tenantWriteRepository);
  });

  it('should resolve when no tenant exists with that app+slug', async () => {
    tenantWriteRepository.findByAppIdAndSlug.mockResolvedValue(null);

    await expect(
      service.execute(
        UuidValueObject.generate(),
        new TenantSlugValueObject('my-garden'),
      ),
    ).resolves.toBeUndefined();
  });

  it('should throw TenantSlugAlreadyExistsException when taken', async () => {
    tenantWriteRepository.findByAppIdAndSlug.mockResolvedValue(
      {} as unknown as TenantAggregate,
    );

    await expect(
      service.execute(
        UuidValueObject.generate(),
        new TenantSlugValueObject('my-garden'),
      ),
    ).rejects.toThrow(TenantSlugAlreadyExistsException);
  });
});
