import { AppViewModel } from '@contexts/app/domain/view-models/app.view-model';
import { AppGraphQLMapper } from '@contexts/app/transport/graphql/mappers/app/app.mapper';
import { PaginatedResult } from '@sisques-labs/nestjs-kit';

describe('AppGraphQLMapper', () => {
  let mapper: AppGraphQLMapper;

  beforeEach(() => {
    mapper = new AppGraphQLMapper();
  });

  const buildViewModel = (): AppViewModel =>
    new AppViewModel({
      id: 'app-1',
      slug: 'gardenia',
      name: 'Gardenia',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    });

  describe('toResponseDtoFromViewModel', () => {
    it('maps every field from the view model', () => {
      const vm = buildViewModel();

      expect(mapper.toResponseDtoFromViewModel(vm)).toEqual({
        id: 'app-1',
        slug: 'gardenia',
        name: 'Gardenia',
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
