import { CreateAppCommand } from '@contexts/app/application/commands/create-app/create-app.command';
import { AssertAppSlugAvailableService } from '@contexts/app/application/services/write/assert-app-slug-available/assert-app-slug-available.service';
import { AppBuilder } from '@contexts/app/domain/builders/app.builder';
import { AppSlugAlreadyExistsException } from '@contexts/app/domain/exceptions/app-slug-already-exists.exception';
import { IAppWriteRepository } from '@contexts/app/domain/repositories/write/app-write.repository';
import { EventBus } from '@nestjs/cqrs';

import { CreateAppCommandHandler } from './create-app.handler';

describe('CreateAppCommandHandler', () => {
  let handler: CreateAppCommandHandler;
  let appWriteRepository: jest.Mocked<IAppWriteRepository>;
  let assertAppSlugAvailableService: jest.Mocked<AssertAppSlugAvailableService>;
  let eventBus: jest.Mocked<EventBus>;

  const command = new CreateAppCommand({ slug: 'gardenia', name: 'Gardenia' });

  beforeEach(() => {
    appWriteRepository = {
      findBySlug: jest.fn(),
      findById: jest.fn(),
      findByCriteria: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };
    assertAppSlugAvailableService = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<AssertAppSlugAvailableService>;
    eventBus = {
      publish: jest.fn(),
      publishAll: jest.fn(),
    } as unknown as jest.Mocked<EventBus>;

    handler = new CreateAppCommandHandler(
      appWriteRepository,
      assertAppSlugAvailableService,
      new AppBuilder(),
      eventBus,
    );
  });

  it('should assert slug availability before saving', async () => {
    appWriteRepository.save.mockResolvedValue(undefined as never);

    await handler.execute(command);

    expect(assertAppSlugAvailableService.execute).toHaveBeenCalledWith(
      command.slug,
    );
  });

  it('should not save when the slug is taken', async () => {
    assertAppSlugAvailableService.execute.mockRejectedValue(
      new AppSlugAlreadyExistsException('gardenia'),
    );

    await expect(handler.execute(command)).rejects.toThrow(
      AppSlugAlreadyExistsException,
    );
    expect(appWriteRepository.save).not.toHaveBeenCalled();
  });

  it('should save the app and publish events', async () => {
    appWriteRepository.save.mockResolvedValue(undefined as never);

    const result = await handler.execute(command);

    expect(appWriteRepository.save).toHaveBeenCalledTimes(1);
    expect(eventBus.publishAll).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      appId: expect.any(String),
      slug: 'gardenia',
      name: 'Gardenia',
    });
  });
});
