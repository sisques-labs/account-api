import { TenantMembershipFindByUserIdQuery } from '@contexts/tenancy/application/queries/tenant-membership-find-by-user-id/tenant-membership-find-by-user-id.query';
import { ITenantMembershipReadRepository } from '@contexts/tenancy/domain/repositories/read/tenant-membership-read.repository';
import { TenantMembershipViewModel } from '@contexts/tenancy/domain/view-models/tenant-membership.view-model';

import { TenantMembershipFindByUserIdQueryHandler } from './tenant-membership-find-by-user-id.handler';

describe('TenantMembershipFindByUserIdQueryHandler', () => {
  let handler: TenantMembershipFindByUserIdQueryHandler;
  let tenantMembershipReadRepository: jest.Mocked<ITenantMembershipReadRepository>;

  const USER_ID = '550e8400-e29b-41d4-a716-446655440000';

  beforeEach(() => {
    tenantMembershipReadRepository = {
      findAllByTenantId: jest.fn(),
      findAllByUserId: jest.fn(),
      findById: jest.fn(),
      findByCriteria: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };
    handler = new TenantMembershipFindByUserIdQueryHandler(
      tenantMembershipReadRepository,
    );
  });

  it('should return the memberships for the user', async () => {
    const membership = new TenantMembershipViewModel({
      id: '550e8400-e29b-41d4-a716-446655440030',
      tenantId: '550e8400-e29b-41d4-a716-446655440020',
      userId: USER_ID,
      role: 'owner',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    tenantMembershipReadRepository.findAllByUserId.mockResolvedValue([
      membership,
    ]);

    const result = await handler.execute(
      new TenantMembershipFindByUserIdQuery({ userId: USER_ID }),
    );

    expect(result).toEqual([membership]);
  });

  it('should return an empty array when the user has no memberships', async () => {
    tenantMembershipReadRepository.findAllByUserId.mockResolvedValue([]);

    const result = await handler.execute(
      new TenantMembershipFindByUserIdQuery({ userId: USER_ID }),
    );

    expect(result).toEqual([]);
  });
});
