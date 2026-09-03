import { TenantMembershipViewModel } from '@contexts/tenancy/domain/view-models/tenant-membership.view-model';

import { TenantMembershipRestMapper } from './tenant-membership.mapper';

describe('TenantMembershipRestMapper', () => {
  it('should map a ViewModel to a plain response object', () => {
    const mapper = new TenantMembershipRestMapper();
    const now = new Date('2024-01-01T00:00:00.000Z');
    const viewModel = new TenantMembershipViewModel({
      id: '550e8400-e29b-41d4-a716-446655440030',
      tenantId: '550e8400-e29b-41d4-a716-446655440020',
      userId: '550e8400-e29b-41d4-a716-446655440000',
      role: 'owner',
      createdAt: now,
      updatedAt: now,
    });

    const dto = mapper.toResponseDto(viewModel);

    expect(dto).toEqual({
      id: '550e8400-e29b-41d4-a716-446655440030',
      tenantId: '550e8400-e29b-41d4-a716-446655440020',
      userId: '550e8400-e29b-41d4-a716-446655440000',
      role: 'owner',
      createdAt: now,
      updatedAt: now,
    });
    expect(Object.keys(dto).sort()).toEqual(
      ['id', 'tenantId', 'userId', 'role', 'createdAt', 'updatedAt'].sort(),
    );
  });
});
