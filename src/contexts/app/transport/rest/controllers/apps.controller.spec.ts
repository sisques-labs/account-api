import { CreateAppCommand } from '@contexts/app/application/commands/create-app/create-app.command';
import { AppFindByCriteriaQuery } from '@contexts/app/application/queries/app-find-by-criteria/app-find-by-criteria.query';
import { AppViewModel } from '@contexts/app/domain/view-models/app.view-model';
import { AppRestMapper } from '@contexts/app/transport/rest/mappers/app/app.mapper';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { FilterOperator, PaginatedResult } from '@sisques-labs/nestjs-kit';

import { AppsController } from './apps.controller';

describe('AppsController', () => {
  let controller: AppsController;
  let commandBus: jest.Mocked<CommandBus>;
  let queryBus: jest.Mocked<QueryBus>;
  let appRestMapper: jest.Mocked<AppRestMapper>;

  beforeEach(() => {
    commandBus = { execute: jest.fn() } as unknown as jest.Mocked<CommandBus>;
    queryBus = { execute: jest.fn() } as unknown as jest.Mocked<QueryBus>;
    appRestMapper = {
      toResponseDto: jest.fn(),
    } as unknown as jest.Mocked<AppRestMapper>;
    controller = new AppsController(commandBus, queryBus, appRestMapper);
  });

  it('should dispatch a CreateAppCommand', async () => {
    commandBus.execute.mockResolvedValue('app-1');

    const result = await controller.create({
      slug: 'gardenia',
      name: 'Gardenia',
    });

    expect(commandBus.execute).toHaveBeenCalledWith(
      expect.any(CreateAppCommand),
    );
    expect(result).toEqual('app-1');
  });

  it('should dispatch a CreateAppCommand with a slug generated from the name when the slug is omitted', async () => {
    commandBus.execute.mockResolvedValue('app-1');

    await controller.create({ name: 'Gardenia' });

    const dispatchedCommand = commandBus.execute.mock
      .calls[0][0] as CreateAppCommand;
    expect(dispatchedCommand.slug.value).toEqual('gardenia');
  });

  it('should dispatch an AppFindByCriteriaQuery and map results through AppRestMapper', async () => {
    const viewModel = new AppViewModel({
      id: 'app-1',
      slug: 'gardenia',
      name: 'Gardenia',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    queryBus.execute.mockResolvedValue(
      new PaginatedResult([viewModel], 1, 1, 10),
    );
    appRestMapper.toResponseDto.mockReturnValue({
      id: 'app-1',
      slug: 'gardenia',
      name: 'Gardenia',
      createdAt: viewModel.createdAt,
      updatedAt: viewModel.updatedAt,
    });

    const result = await controller.findByCriteria({});

    expect(queryBus.execute).toHaveBeenCalledWith(
      expect.any(AppFindByCriteriaQuery),
    );
    expect(appRestMapper.toResponseDto).toHaveBeenCalledWith(viewModel);
    expect(result.items).toEqual([
      expect.objectContaining({ id: 'app-1', slug: 'gardenia' }),
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

    const query = queryBus.execute.mock.calls[0][0] as AppFindByCriteriaQuery;
    expect(query.criteria.filters).toEqual([
      { field: 'slug', operator: FilterOperator.LIKE, value: 'garden' },
      { field: 'name', operator: FilterOperator.LIKE, value: 'Gar' },
    ]);
    expect(query.criteria.pagination).toEqual({ page: 2, perPage: 5 });
  });
});
