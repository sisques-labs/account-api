import { AppFindByIdQuery } from '@contexts/app/application/queries/app-find-by-id/app-find-by-id.query';
import { AppNotFoundException } from '@contexts/app/domain/exceptions/app-not-found.exception';
import { AppViewModel } from '@contexts/app/domain/view-models/app.view-model';
import { QueryBus } from '@nestjs/cqrs';

import { AppLookupAdapter } from './app-lookup.adapter';

describe('AppLookupAdapter', () => {
  let adapter: AppLookupAdapter;
  let queryBus: jest.Mocked<QueryBus>;

  const APP_ID = '550e8400-e29b-41d4-a716-446655440010';

  beforeEach(() => {
    queryBus = { execute: jest.fn() } as unknown as jest.Mocked<QueryBus>;
    adapter = new AppLookupAdapter(queryBus);
  });

  it('should dispatch AppFindByIdQuery and resolve when the app exists', async () => {
    const viewModel = new AppViewModel({
      id: APP_ID,
      slug: 'gardenia',
      name: 'Gardenia',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    queryBus.execute.mockResolvedValue(viewModel);

    await expect(adapter.assertExists(APP_ID)).resolves.toBeUndefined();

    expect(queryBus.execute).toHaveBeenCalledWith(expect.any(AppFindByIdQuery));
  });

  it('should throw AppNotFoundException when the app does not exist', async () => {
    queryBus.execute.mockResolvedValue(null);

    await expect(adapter.assertExists(APP_ID)).rejects.toThrow(
      AppNotFoundException,
    );
  });
});
