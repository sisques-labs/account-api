import { IAppReadRepository } from '@contexts/app/domain/repositories/read/app-read.repository';
import { AppViewModel } from '@contexts/app/domain/view-models/app.view-model';

import { AppFindByIdQuery } from './app-find-by-id.query';
import { AppFindByIdQueryHandler } from './app-find-by-id.handler';

describe('AppFindByIdQueryHandler', () => {
  let handler: AppFindByIdQueryHandler;
  let appReadRepository: jest.Mocked<IAppReadRepository>;

  const APP_ID = '550e8400-e29b-41d4-a716-446655440010';

  beforeEach(() => {
    appReadRepository = {
      findById: jest.fn(),
      findByCriteria: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };
    handler = new AppFindByIdQueryHandler(appReadRepository);
  });

  it('should return the app when found', async () => {
    const app = new AppViewModel({
      id: APP_ID,
      slug: 'gardenia',
      name: 'Gardenia',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    appReadRepository.findById.mockResolvedValue(app);

    const result = await handler.execute(new AppFindByIdQuery({ id: APP_ID }));

    expect(appReadRepository.findById).toHaveBeenCalledWith(APP_ID);
    expect(result).toBe(app);
  });

  it('should return null when the app does not exist', async () => {
    appReadRepository.findById.mockResolvedValue(null);

    const result = await handler.execute(new AppFindByIdQuery({ id: APP_ID }));

    expect(result).toBeNull();
  });
});
