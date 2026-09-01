import { AppAggregate } from '@contexts/app/domain/aggregates/app/app.aggregate';
import { AppNotFoundException } from '@contexts/app/domain/exceptions/app-not-found.exception';
import { IAppWriteRepository } from '@contexts/app/domain/repositories/write/app-write.repository';
import { UuidValueObject } from '@sisques-labs/nestjs-kit';

import { AssertAppExistsService } from './assert-app-exists.service';

describe('AssertAppExistsService', () => {
  let service: AssertAppExistsService;
  let appWriteRepository: jest.Mocked<IAppWriteRepository>;

  beforeEach(() => {
    appWriteRepository = {
      findBySlug: jest.fn(),
      findById: jest.fn(),
      findByCriteria: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };
    service = new AssertAppExistsService(appWriteRepository);
  });

  it('should return the app when found', async () => {
    const app = {} as unknown as AppAggregate;
    appWriteRepository.findById.mockResolvedValue(app);

    const id = UuidValueObject.generate();
    await expect(service.execute(id)).resolves.toBe(app);
  });

  it('should throw AppNotFoundException when not found', async () => {
    appWriteRepository.findById.mockResolvedValue(null);

    await expect(service.execute(UuidValueObject.generate())).rejects.toThrow(
      AppNotFoundException,
    );
  });
});
