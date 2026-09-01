import { TenantViewModel } from '@contexts/tenancy/domain/view-models/tenant.view-model';
import { TenantGraphQLMapper } from '@contexts/tenancy/transport/graphql/mappers/tenant/tenant.mapper';
import { PaginatedResult } from '@sisques-labs/nestjs-kit';

describe('TenantGraphQLMapper', () => {
  let mapper: TenantGraphQLMapper;

  beforeEach(() => {
    mapper = new TenantGraphQLMapper();
  });

  const buildViewModel = (): TenantViewModel =>
    new TenantViewModel({
      id: 'tenant-1',
      appId: 'app-1',
      name: 'My Garden',
      slug: 'my-garden',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    });

  describe('toResponseDtoFromViewModel', () => {
    it('maps every field from the view model', () => {
      const vm = buildViewModel();

      expect(mapper.toResponseDtoFromViewModel(vm)).toEqual({
        id: 'tenant-1',
        appId: 'app-1',
        name: 'My Garden',
        slug: 'my-garden',
        createdAt: vm.createdAt,
        updatedAt: vm.updatedAt,
      });
    });
  });

  describe('toPaginatedResponseDto', () => {
    it('maps items and pagination metadata', () => {
      const vm = buildViewModel();
      const paginatedResult = new PaginatedResult([vm], 1, 1, 20);

      expect(mapper.toPaginatedResponseDto(paginatedResult)).toEqual({
        items: [mapper.toResponseDtoFromViewModel(vm)],
        total: 1,
        page: 1,
        perPage: 20,
        totalPages: 1,
      });
    });
  });
});
