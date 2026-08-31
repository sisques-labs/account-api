import { TenantMembershipFindByUserIdQuery } from '@contexts/tenancy/application/queries/tenant-membership-find-by-user-id/tenant-membership-find-by-user-id.query';
import { TenantMembershipViewModel } from '@contexts/tenancy/domain/view-models/tenant-membership.view-model';
import { QueryBus } from '@nestjs/cqrs';

import { TenantMembershipLookupAdapter } from './tenant-membership-lookup.adapter';

describe('TenantMembershipLookupAdapter', () => {
  let adapter: TenantMembershipLookupAdapter;
  let queryBus: jest.Mocked<QueryBus>;

  beforeEach(() => {
    queryBus = { execute: jest.fn() } as unknown as jest.Mocked<QueryBus>;
    adapter = new TenantMembershipLookupAdapter(queryBus);
  });

  it('should dispatch TenantMembershipFindByUserIdQuery and map to claims', async () => {
    const viewModel = new TenantMembershipViewModel({
      id: '550e8400-e29b-41d4-a716-446655440000',
      tenantId: 'tenant-1',
      userId: 'user-1',
      role: 'owner',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    queryBus.execute.mockResolvedValue([viewModel]);

    const result = await adapter.findMembershipsByUserId(
      '550e8400-e29b-41d4-a716-446655440000',
    );

    expect(queryBus.execute).toHaveBeenCalledWith(
      expect.any(TenantMembershipFindByUserIdQuery),
    );
    expect(result).toEqual([{ tenantId: 'tenant-1', role: 'owner' }]);
  });

  it('should return an empty array when the user has no memberships', async () => {
    queryBus.execute.mockResolvedValue([]);

    const result = await adapter.findMembershipsByUserId(
      '550e8400-e29b-41d4-a716-446655440000',
    );

    expect(result).toEqual([]);
  });
});
