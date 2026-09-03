import { TenantFindByCriteriaQuery } from '@contexts/tenancy/application/queries/tenant-find-by-criteria/tenant-find-by-criteria.query';
import { TenantMembershipFindByTenantIdQuery } from '@contexts/tenancy/application/queries/tenant-membership-find-by-tenant-id/tenant-membership-find-by-tenant-id.query';
import { TenantRoleEnum } from '@contexts/tenancy/domain/enums/tenant-role.enum';
import { TenantMembershipViewModel } from '@contexts/tenancy/domain/view-models/tenant-membership.view-model';
import { TenantViewModel } from '@contexts/tenancy/domain/view-models/tenant.view-model';
import { TenantMembershipGraphQLMapper } from '@contexts/tenancy/transport/graphql/mappers/tenant-membership/tenant-membership.mapper';
import { TenantGraphQLMapper } from '@contexts/tenancy/transport/graphql/mappers/tenant/tenant.mapper';
import { TenantQueriesResolver } from '@contexts/tenancy/transport/graphql/resolvers/tenant/tenant-queries.resolver';
import { QueryBus } from '@nestjs/cqrs';
import { PaginatedResult } from '@sisques-labs/nestjs-kit';

describe('TenantQueriesResolver', () => {
  let resolver: TenantQueriesResolver;
  let queryBus: jest.Mocked<QueryBus>;
  let tenantMapper: jest.Mocked<TenantGraphQLMapper>;
  let membershipMapper: jest.Mocked<TenantMembershipGraphQLMapper>;

  const TENANT_ID = '550e8400-e29b-41d4-a716-446655440010';
  const APP_ID = '550e8400-e29b-41d4-a716-446655440020';

  beforeEach(() => {
    queryBus = { execute: jest.fn() } as unknown as jest.Mocked<QueryBus>;
    tenantMapper = {
      toResponseDtoFromViewModel: jest.fn(),
      toPaginatedResponseDto: jest.fn(),
    } as unknown as jest.Mocked<TenantGraphQLMapper>;
    membershipMapper = {
      toResponseDtoFromViewModel: jest.fn(),
    } as unknown as jest.Mocked<TenantMembershipGraphQLMapper>;
    resolver = new TenantQueriesResolver(
      queryBus,
      tenantMapper,
      membershipMapper,
    );
  });

  describe('tenantsFindByCriteria', () => {
    it('dispatches TenantFindByCriteriaQuery and maps the paginated result', async () => {
      const vm = new TenantViewModel({
        id: TENANT_ID,
        appId: APP_ID,
        name: 'My Garden',
        slug: 'my-garden',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const paginatedResult = new PaginatedResult([vm], 1, 1, 20);
      queryBus.execute.mockResolvedValue(paginatedResult);
      tenantMapper.toPaginatedResponseDto.mockReturnValue({
        items: [],
        total: 1,
        page: 1,
        perPage: 20,
        totalPages: 1,
      });

      const result = await resolver.tenantsFindByCriteria(undefined);

      expect(queryBus.execute).toHaveBeenCalledWith(
        expect.any(TenantFindByCriteriaQuery),
      );
      expect(tenantMapper.toPaginatedResponseDto).toHaveBeenCalledWith(
        paginatedResult,
      );
      expect(result.total).toBe(1);
    });
  });

  describe('tenantMembershipsFindByTenantId', () => {
    it('dispatches TenantMembershipFindByTenantIdQuery and maps each member', async () => {
      const membership = new TenantMembershipViewModel({
        id: '550e8400-e29b-41d4-a716-446655440030',
        tenantId: TENANT_ID,
        userId: '550e8400-e29b-41d4-a716-446655440040',
        role: TenantRoleEnum.OWNER,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      queryBus.execute.mockResolvedValue([membership]);
      membershipMapper.toResponseDtoFromViewModel.mockReturnValue({
        id: membership.id,
        tenantId: membership.tenantId,
        userId: membership.userId,
        role: TenantRoleEnum.OWNER,
        createdAt: membership.createdAt,
        updatedAt: membership.updatedAt,
      });

      const result = await resolver.tenantMembershipsFindByTenantId({
        tenantId: TENANT_ID,
      });

      expect(queryBus.execute).toHaveBeenCalledWith(
        new TenantMembershipFindByTenantIdQuery({ tenantId: TENANT_ID }),
      );
      expect(membershipMapper.toResponseDtoFromViewModel).toHaveBeenCalledWith(
        membership,
      );
      expect(result).toHaveLength(1);
    });
  });
});
