import { AddTenantMemberCommand } from '@contexts/tenancy/application/commands/add-tenant-member/add-tenant-member.command';
import { CreateTenantCommand } from '@contexts/tenancy/application/commands/create-tenant/create-tenant.command';
import { TenantMembershipFindByTenantIdQuery } from '@contexts/tenancy/application/queries/tenant-membership-find-by-tenant-id/tenant-membership-find-by-tenant-id.query';
import { TenantMembershipViewModel } from '@contexts/tenancy/domain/view-models/tenant-membership.view-model';
import { TenantMembershipRestMapper } from '@contexts/tenancy/transport/rest/mappers/tenant-membership/tenant-membership.mapper';
import { CurrentUserPayload } from '@core/security/decorators/current-user.decorator';
import { CommandBus, QueryBus } from '@nestjs/cqrs';

import { TenantsController } from './tenants.controller';

describe('TenantsController', () => {
  let controller: TenantsController;
  let commandBus: jest.Mocked<CommandBus>;
  let queryBus: jest.Mocked<QueryBus>;
  let tenantMembershipRestMapper: jest.Mocked<TenantMembershipRestMapper>;

  const currentUser: CurrentUserPayload = {
    userId: '550e8400-e29b-41d4-a716-446655440000',
    email: 'owner@example.com',
    platformAdmin: false,
    tenants: [],
  };

  beforeEach(() => {
    commandBus = { execute: jest.fn() } as unknown as jest.Mocked<CommandBus>;
    queryBus = { execute: jest.fn() } as unknown as jest.Mocked<QueryBus>;
    tenantMembershipRestMapper = {
      toResponseDto: jest.fn(),
    } as unknown as jest.Mocked<TenantMembershipRestMapper>;
    controller = new TenantsController(
      commandBus,
      queryBus,
      tenantMembershipRestMapper,
    );
  });

  it('should dispatch a CreateTenantCommand using the current user as creator', async () => {
    commandBus.execute.mockResolvedValue({
      tenantId: 'tenant-1',
      appId: 'app-1',
      name: 'My Garden',
      slug: 'my-garden',
    });

    await controller.create(
      { appId: '550e8400-e29b-41d4-a716-446655440010', name: 'My Garden' },
      currentUser,
    );

    expect(commandBus.execute).toHaveBeenCalledWith(
      expect.any(CreateTenantCommand),
    );
    const dispatched = commandBus.execute.mock
      .calls[0][0] as CreateTenantCommand;
    expect(dispatched.creatorUserId.value).toBe(currentUser.userId);
  });

  it('should dispatch an AddTenantMemberCommand for the given tenant', async () => {
    commandBus.execute.mockResolvedValue({
      membershipId: 'membership-1',
      tenantId: 'tenant-1',
      userId: 'user-2',
      role: 'member',
    });

    await controller.addMember('550e8400-e29b-41d4-a716-446655440020', {
      email: 'member@example.com',
      role: 'member',
    });

    expect(commandBus.execute).toHaveBeenCalledWith(
      expect.any(AddTenantMemberCommand),
    );
  });

  it('should dispatch a TenantMembershipFindByTenantIdQuery and map results through TenantMembershipRestMapper', async () => {
    const viewModel = new TenantMembershipViewModel({
      id: 'membership-1',
      tenantId: '550e8400-e29b-41d4-a716-446655440020',
      userId: currentUser.userId,
      role: 'owner',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    queryBus.execute.mockResolvedValue([viewModel]);
    tenantMembershipRestMapper.toResponseDto.mockReturnValue({
      id: 'membership-1',
      tenantId: viewModel.tenantId,
      userId: viewModel.userId,
      role: 'owner',
      createdAt: viewModel.createdAt,
      updatedAt: viewModel.updatedAt,
    });

    const result = await controller.listMembers(
      '550e8400-e29b-41d4-a716-446655440020',
    );

    expect(queryBus.execute).toHaveBeenCalledWith(
      expect.any(TenantMembershipFindByTenantIdQuery),
    );
    expect(tenantMembershipRestMapper.toResponseDto).toHaveBeenCalledWith(
      viewModel,
    );
    expect(result).toEqual([expect.objectContaining({ role: 'owner' })]);
  });
});
