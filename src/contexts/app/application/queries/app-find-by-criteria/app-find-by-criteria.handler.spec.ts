import { IAppReadRepository } from '@contexts/app/domain/repositories/read/app-read.repository';
import { AppViewModel } from '@contexts/app/domain/view-models/app.view-model';
import { Criteria, PaginatedResult } from '@sisques-labs/nestjs-kit';

import { AppFindByCriteriaQuery } from './app-find-by-criteria.query';
import { AppFindByCriteriaQueryHandler } from './app-find-by-criteria.handler';

describe('AppFindByCriteriaQueryHandler', () => {
  let handler: AppFindByCriteriaQueryHandler;
  let readRepository: jest.Mocked<IAppReadRepository>;

  beforeEach(() => {
    readRepository = {
      findById: jest.fn(),
      findByCriteria: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };
    handler = new AppFindByCriteriaQueryHandler(readRepository);
  });

  it('should delegate to the read repository and return the paginated result', async () => {
    const criteria = {} as Criteria;
    const paginated = new PaginatedResult<AppViewModel>([], 0, 1, 10);
    readRepository.findByCriteria.mockResolvedValue(paginated);

    const result = await handler.execute(
      new AppFindByCriteriaQuery({ criteria }),
    );

    expect(readRepository.findByCriteria).toHaveBeenCalledWith(criteria);
    expect(result).toBe(paginated);
  });

  it('should propagate repository errors', async () => {
    readRepository.findByCriteria.mockRejectedValue(new Error('DB error'));

    await expect(
      handler.execute(new AppFindByCriteriaQuery({ criteria: {} as Criteria })),
    ).rejects.toThrow('DB error');
  });
});
