import { IAppReadRepository } from '@contexts/app/domain/repositories/read/app-read.repository';
import { AppViewModel } from '@contexts/app/domain/view-models/app.view-model';
import { PaginatedResult } from '@sisques-labs/nestjs-kit';

import { AppFindAllQueryHandler } from './app-find-all.handler';

describe('AppFindAllQueryHandler', () => {
  let handler: AppFindAllQueryHandler;
  let appReadRepository: jest.Mocked<IAppReadRepository>;

  beforeEach(() => {
    appReadRepository = {
      findById: jest.fn(),
      findByCriteria: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };
    handler = new AppFindAllQueryHandler(appReadRepository);
  });

  it('should return the items from the read repository', async () => {
    const app = new AppViewModel({
      id: '550e8400-e29b-41d4-a716-446655440010',
      slug: 'gardenia',
      name: 'Gardenia',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    appReadRepository.findByCriteria.mockResolvedValue(
      new PaginatedResult([app], 1, 1, 100),
    );

    const result = await handler.execute();

    expect(result).toEqual([app]);
  });
});
