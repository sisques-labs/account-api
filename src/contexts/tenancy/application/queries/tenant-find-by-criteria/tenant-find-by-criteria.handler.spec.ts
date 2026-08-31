import { ITenantReadRepository } from '@contexts/tenancy/domain/repositories/read/tenant-read.repository';
import { TenantViewModel } from '@contexts/tenancy/domain/view-models/tenant.view-model';
import { Criteria, PaginatedResult } from '@sisques-labs/nestjs-kit';

import { TenantFindByCriteriaQuery } from './tenant-find-by-criteria.query';
import { TenantFindByCriteriaQueryHandler } from './tenant-find-by-criteria.handler';

describe('TenantFindByCriteriaQueryHandler', () => {
  let handler: TenantFindByCriteriaQueryHandler;
  let readRepository: jest.Mocked<ITenantReadRepository>;

  beforeEach(() => {
    readRepository = {
      findById: jest.fn(),
      findByCriteria: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };
    handler = new TenantFindByCriteriaQueryHandler(readRepository);
  });

  it('should delegate to the read repository and return the paginated result', async () => {
    const criteria = {} as Criteria;
    const paginated = new PaginatedResult<TenantViewModel>([], 0, 1, 10);
    readRepository.findByCriteria.mockResolvedValue(paginated);

    const result = await handler.execute(
      new TenantFindByCriteriaQuery({ criteria }),
    );

    expect(readRepository.findByCriteria).toHaveBeenCalledWith(criteria);
    expect(result).toBe(paginated);
  });

  it('should propagate repository errors', async () => {
    readRepository.findByCriteria.mockRejectedValue(new Error('DB error'));

    await expect(
      handler.execute(
        new TenantFindByCriteriaQuery({ criteria: {} as Criteria }),
      ),
    ).rejects.toThrow('DB error');
  });
});
