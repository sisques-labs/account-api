import { TenantMembershipFindByTenantIdQuery } from '@contexts/tenancy/application/queries/tenant-membership-find-by-tenant-id/tenant-membership-find-by-tenant-id.query';
import { AssertTenantExistsService } from '@contexts/tenancy/application/services/write/assert-tenant-exists/assert-tenant-exists.service';
import { TenantNotFoundException } from '@contexts/tenancy/domain/exceptions/tenant-not-found.exception';
import { ITenantMembershipReadRepository } from '@contexts/tenancy/domain/repositories/read/tenant-membership-read.repository';
import { TenantMembershipViewModel } from '@contexts/tenancy/domain/view-models/tenant-membership.view-model';

import { TenantMembershipFindByTenantIdQueryHandler } from './tenant-membership-find-by-tenant-id.handler';

describe('TenantMembershipFindByTenantIdQueryHandler', () => {
  let handler: TenantMembershipFindByTenantIdQueryHandler;
  let tenantMembershipReadRepository: jest.Mocked<ITenantMembershipReadRepository>;
  let assertTenantExistsService: jest.Mocked<AssertTenantExistsService>;

  const TENANT_ID = '550e8400-e29b-41d4-a716-446655440020';

  beforeEach(() => {
    tenantMembershipReadRepository = {
      findAllByTenantId: jest.fn(),
      findAllByUserId: jest.fn(),
      findById: jest.fn(),
      findByCriteria: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };
    assertTenantExistsService = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<AssertTenantExistsService>;

    handler = new TenantMembershipFindByTenantIdQueryHandler(
      tenantMembershipReadRepository,
      assertTenantExistsService,
    );
  });

  it('should throw when the tenant does not exist', async () => {
    assertTenantExistsService.execute.mockRejectedValue(
      new TenantNotFoundException(TENANT_ID),
    );

    await expect(
      handler.execute(
        new TenantMembershipFindByTenantIdQuery({ tenantId: TENANT_ID }),
      ),
    ).rejects.toThrow(TenantNotFoundException);
  });

  it('should return the members of the tenant', async () => {
    const membership = new TenantMembershipViewModel({
      id: '550e8400-e29b-41d4-a716-446655440030',
      tenantId: TENANT_ID,
      userId: '550e8400-e29b-41d4-a716-446655440000',
      role: 'owner',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    tenantMembershipReadRepository.findAllByTenantId.mockResolvedValue([
      membership,
    ]);

    const result = await handler.execute(
      new TenantMembershipFindByTenantIdQuery({ tenantId: TENANT_ID }),
    );

    expect(result).toEqual([membership]);
  });
});
