import { CreateAppCommand } from '@contexts/app/application/commands/create-app/create-app.command';
import { AppFindAllQuery } from '@contexts/app/application/queries/app-find-all/app-find-all.query';
import { AppViewModel } from '@contexts/app/domain/view-models/app.view-model';
import { AppRestMapper } from '@contexts/app/transport/rest/mappers/app/app.mapper';
import { CommandBus, QueryBus } from '@nestjs/cqrs';

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
    commandBus.execute.mockResolvedValue({
      id: 'app-1',
    });

    const result = await controller.create({
      slug: 'gardenia',
      name: 'Gardenia',
    });

    expect(commandBus.execute).toHaveBeenCalledWith(
      expect.any(CreateAppCommand),
    );
    expect(result).toEqual('app-1');
  });

  it('should dispatch an AppFindAllQuery and map results through AppRestMapper', async () => {
    const viewModel = new AppViewModel({
      id: 'app-1',
      slug: 'gardenia',
      name: 'Gardenia',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    queryBus.execute.mockResolvedValue([viewModel]);
    appRestMapper.toResponseDto.mockReturnValue({
      id: 'app-1',
      slug: 'gardenia',
      name: 'Gardenia',
      createdAt: viewModel.createdAt,
      updatedAt: viewModel.updatedAt,
    });

    const result = await controller.findAll();

    expect(queryBus.execute).toHaveBeenCalledWith(expect.any(AppFindAllQuery));
    expect(appRestMapper.toResponseDto).toHaveBeenCalledWith(viewModel);
    expect(result).toEqual([
      expect.objectContaining({ id: 'app-1', slug: 'gardenia' }),
    ]);
  });
});
