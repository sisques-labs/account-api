import { AppAggregate } from '@contexts/tenancy/domain/aggregates/app.aggregate';
import { AppSlugAlreadyExistsException } from '@contexts/tenancy/domain/exceptions/app-slug-already-exists.exception';
import { IAppWriteRepository } from '@contexts/tenancy/domain/repositories/write/app-write.repository';
import { AppSlugValueObject } from '@contexts/tenancy/domain/value-objects/app-slug/app-slug.vo';

import { AssertAppSlugAvailableService } from './assert-app-slug-available.service';

describe('AssertAppSlugAvailableService', () => {
  let service: AssertAppSlugAvailableService;
  let appWriteRepository: jest.Mocked<IAppWriteRepository>;

  beforeEach(() => {
    appWriteRepository = {
      findBySlug: jest.fn(),
      findById: jest.fn(),
      findByCriteria: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };
    service = new AssertAppSlugAvailableService(appWriteRepository);
  });

  it('should resolve when no app exists with that slug', async () => {
    appWriteRepository.findBySlug.mockResolvedValue(null);

    await expect(
      service.execute(new AppSlugValueObject('gardenia')),
    ).resolves.toBeUndefined();
  });

  it('should throw AppSlugAlreadyExistsException when the slug is taken', async () => {
    appWriteRepository.findBySlug.mockResolvedValue(
      {} as unknown as AppAggregate,
    );

    await expect(
      service.execute(new AppSlugValueObject('gardenia')),
    ).rejects.toThrow(AppSlugAlreadyExistsException);
  });
});
