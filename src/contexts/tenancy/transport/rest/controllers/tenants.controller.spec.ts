import { AddTenantMemberCommand } from '@contexts/tenancy/application/commands/add-tenant-member/add-tenant-member.command';
import { CreateTenantCommand } from '@contexts/tenancy/application/commands/create-tenant/create-tenant.command';
import { DeleteTenantCommand } from '@contexts/tenancy/application/commands/delete-tenant/delete-tenant.command';
import { UpdateTenantCommand } from '@contexts/tenancy/application/commands/update-tenant/update-tenant.command';
import { TenantFindByCriteriaQuery } from '@contexts/tenancy/application/queries/tenant-find-by-criteria/tenant-find-by-criteria.query';
import { TenantMembershipFindByTenantIdQuery } from '@contexts/tenancy/application/queries/tenant-membership-find-by-tenant-id/tenant-membership-find-by-tenant-id.query';
import { TenantRoleEnum } from '@contexts/tenancy/domain/enums/tenant-role.enum';
import { TenantMembershipViewModel } from '@contexts/tenancy/domain/view-models/tenant-membership.view-model';
import { TenantViewModel } from '@contexts/tenancy/domain/view-models/tenant.view-model';
import { TenantMembershipRestMapper } from '@contexts/tenancy/transport/rest/mappers/tenant-membership/tenant-membership.mapper';
import { TenantRestMapper } from '@contexts/tenancy/transport/rest/mappers/tenant/tenant.mapper';
import { CurrentUserPayload } from '@core/security/decorators/current-user.decorator';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { FilterOperator, PaginatedResult } from '@sisques-labs/nestjs-kit';

import { TenantsController } from './tenants.controller';

describe('TenantsController', () => {
  let controller: TenantsController;
  let commandBus: jest.Mocked<CommandBus>;
  let queryBus: jest.Mocked<QueryBus>;
  let tenantMembershipRestMapper: jest.Mocked<TenantMembershipRestMapper>;
  let tenantRestMapper: jest.Mocked<TenantRestMapper>;

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
    tenantRestMapper = {
      toResponseDto: jest.fn(),
    } as unknown as jest.Mocked<TenantRestMapper>;
    controller = new TenantsController(
      commandBus,
      queryBus,
      tenantMembershipRestMapper,
      tenantRestMapper,
    );
  });

  it('should dispatch a TenantFindByCriteriaQuery and map results through TenantRestMapper', async () => {
    const viewModel = new TenantViewModel({
      id: 'tenant-1',
      appId: 'app-1',
      name: 'My Garden',
      slug: 'my-garden',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    queryBus.execute.mockResolvedValue(
      new PaginatedResult([viewModel], 1, 1, 10),
    );
    tenantRestMapper.toResponseDto.mockReturnValue({
      id: 'tenant-1',
      appId: 'app-1',
      name: 'My Garden',
      slug: 'my-garden',
      createdAt: viewModel.createdAt,
      updatedAt: viewModel.updatedAt,
    });

    const result = await controller.findByCriteria({});

    expect(queryBus.execute).toHaveBeenCalledWith(
      expect.any(TenantFindByCriteriaQuery),
    );
    expect(tenantRestMapper.toResponseDto).toHaveBeenCalledWith(viewModel);
    expect(result.items).toEqual([
      expect.objectContaining({ id: 'tenant-1', slug: 'my-garden' }),
    ]);
    expect(result.total).toBe(1);
  });

  it('should build criteria from URL query parameters', async () => {
    queryBus.execute.mockResolvedValue(new PaginatedResult([], 0, 2, 5));

    await controller.findByCriteria({
      slug: 'garden',
      name: 'Gar',
      page: 2,
      limit: 5,
    });

    const query = queryBus.execute.mock
      .calls[0][0] as TenantFindByCriteriaQuery;
    expect(query.criteria.filters).toEqual([
      { field: 'slug', operator: FilterOperator.LIKE, value: 'garden' },
      { field: 'name', operator: FilterOperator.LIKE, value: 'Gar' },
    ]);
    expect(query.criteria.pagination).toEqual({ page: 2, perPage: 5 });
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

  it('should dispatch an UpdateTenantCommand using the current user as requester', async () => {
    commandBus.execute.mockResolvedValue({
      tenantId: 'tenant-1',
      appId: 'app-1',
      name: 'Renamed Garden',
      slug: 'my-garden',
    });

    await controller.update(
      '550e8400-e29b-41d4-a716-446655440020',
      { name: 'Renamed Garden' },
      currentUser,
    );

    expect(commandBus.execute).toHaveBeenCalledWith(
      expect.any(UpdateTenantCommand),
    );
    const dispatched = commandBus.execute.mock
      .calls[0][0] as UpdateTenantCommand;
    expect(dispatched.requesterUserId.value).toBe(currentUser.userId);
  });

  it('should dispatch a DeleteTenantCommand using the current user as requester', async () => {
    commandBus.execute.mockResolvedValue(undefined);

    await controller.remove(
      '550e8400-e29b-41d4-a716-446655440020',
      currentUser,
    );

    expect(commandBus.execute).toHaveBeenCalledWith(
      expect.any(DeleteTenantCommand),
    );
    const dispatched = commandBus.execute.mock
      .calls[0][0] as DeleteTenantCommand;
    expect(dispatched.requesterUserId.value).toBe(currentUser.userId);
  });

  it('should dispatch an AddTenantMemberCommand for the given tenant', async () => {
    commandBus.execute.mockResolvedValue({
      membershipId: 'membership-1',
      tenantId: 'tenant-1',
      userId: 'user-2',
      role: TenantRoleEnum.MEMBER,
    });

    await controller.addMember('550e8400-e29b-41d4-a716-446655440020', {
      email: 'member@example.com',
      role: TenantRoleEnum.MEMBER,
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
