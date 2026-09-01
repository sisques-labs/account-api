import { AppViewModel } from '@contexts/app/domain/view-models/app.view-model';

import { AppRestMapper } from './app.mapper';

describe('AppRestMapper', () => {
  it('should map a ViewModel to a plain response object', () => {
    const mapper = new AppRestMapper();
    const now = new Date('2024-01-01T00:00:00.000Z');
    const viewModel = new AppViewModel({
      id: '550e8400-e29b-41d4-a716-446655440010',
      slug: 'gardenia',
      name: 'Gardenia',
      createdAt: now,
      updatedAt: now,
    });

    const dto = mapper.toResponseDto(viewModel);

    expect(dto).toEqual({
      id: '550e8400-e29b-41d4-a716-446655440010',
      slug: 'gardenia',
      name: 'Gardenia',
      createdAt: now,
      updatedAt: now,
    });
    expect(Object.keys(dto).sort()).toEqual(
      ['id', 'slug', 'name', 'createdAt', 'updatedAt'].sort(),
    );
  });
});
