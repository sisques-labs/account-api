import { AppFindByCriteriaQuery } from '@contexts/app/application/queries/app-find-by-criteria/app-find-by-criteria.query';
import { AppFindByIdQuery } from '@contexts/app/application/queries/app-find-by-id/app-find-by-id.query';
import { AppViewModel } from '@contexts/app/domain/view-models/app.view-model';
import { AppFindByIdRequestDto } from '@contexts/app/transport/graphql/dtos/requests/app/app-find-by-id.request.dto';
import { AppGraphQLMapper } from '@contexts/app/transport/graphql/mappers/app/app.mapper';
import { AppQueriesResolver } from '@contexts/app/transport/graphql/resolvers/app/app-queries.resolver';
import { QueryBus } from '@nestjs/cqrs';
import { PaginatedResult } from '@sisques-labs/nestjs-kit';

describe('AppQueriesResolver', () => {
  let resolver: AppQueriesResolver;
  let queryBus: jest.Mocked<QueryBus>;
  let mapper: jest.Mocked<AppGraphQLMapper>;

  const APP_ID = '550e8400-e29b-41d4-a716-446655440010';
  const MISSING_APP_ID = '550e8400-e29b-41d4-a716-446655440099';

  const buildViewModel = (): AppViewModel =>
    new AppViewModel({
      id: APP_ID,
      slug: 'gardenia',
      name: 'Gardenia',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

  beforeEach(() => {
    queryBus = { execute: jest.fn() } as unknown as jest.Mocked<QueryBus>;
    mapper = {
      toResponseDtoFromViewModel: jest.fn(),
      toPaginatedResponseDto: jest.fn(),
    } as unknown as jest.Mocked<AppGraphQLMapper>;
    resolver = new AppQueriesResolver(queryBus, mapper);
  });

  describe('appFindById', () => {
    it('dispatches AppFindByIdQuery and maps the result', async () => {
      const vm = buildViewModel();
      queryBus.execute.mockResolvedValue(vm);
      mapper.toResponseDtoFromViewModel.mockReturnValue({
        id: vm.id,
        slug: vm.slug,
        name: vm.name,
        createdAt: vm.createdAt,
        updatedAt: vm.updatedAt,
      });

      const input: AppFindByIdRequestDto = { id: APP_ID };
      const result = await resolver.appFindById(input);

      expect(queryBus.execute).toHaveBeenCalledWith(
        new AppFindByIdQuery({ id: APP_ID }),
      );
      expect(mapper.toResponseDtoFromViewModel).toHaveBeenCalledWith(vm);
      expect(result?.id).toBe(APP_ID);
    });

    it('returns null when no app is found', async () => {
      queryBus.execute.mockResolvedValue(null);

      const result = await resolver.appFindById({ id: MISSING_APP_ID });

      expect(result).toBeNull();
      expect(mapper.toResponseDtoFromViewModel).not.toHaveBeenCalled();
    });
  });

  describe('appsFindByCriteria', () => {
    it('dispatches AppFindByCriteriaQuery with a Criteria built from the input and maps the paginated result', async () => {
      const vm = buildViewModel();
      const paginatedResult = new PaginatedResult([vm], 1, 1, 20);
      queryBus.execute.mockResolvedValue(paginatedResult);
      mapper.toPaginatedResponseDto.mockReturnValue({
        items: [
          {
            id: vm.id,
            slug: vm.slug,
            name: vm.name,
            createdAt: vm.createdAt,
            updatedAt: vm.updatedAt,
          },
        ],
        total: 1,
        page: 1,
        perPage: 20,
        totalPages: 1,
      });

      const result = await resolver.appsFindByCriteria(undefined);

      expect(queryBus.execute).toHaveBeenCalledWith(
        expect.any(AppFindByCriteriaQuery),
      );
      expect(mapper.toPaginatedResponseDto).toHaveBeenCalledWith(
        paginatedResult,
      );
      expect(result.total).toBe(1);
    });
  });
});
