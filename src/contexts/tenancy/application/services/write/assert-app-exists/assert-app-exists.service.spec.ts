import { IAppLookupPort } from '@contexts/tenancy/application/ports/app-lookup.port';
import { UuidValueObject } from '@sisques-labs/nestjs-kit';

import { AssertAppExistsService } from './assert-app-exists.service';

describe('AssertAppExistsService', () => {
  let service: AssertAppExistsService;
  let appLookupPort: jest.Mocked<IAppLookupPort>;

  beforeEach(() => {
    appLookupPort = {
      assertExists: jest.fn(),
    };
    service = new AssertAppExistsService(appLookupPort);
  });

  it('should delegate to the app lookup port', async () => {
    const id = UuidValueObject.generate();
    appLookupPort.assertExists.mockResolvedValue(undefined);

    await expect(service.execute(id)).resolves.toBeUndefined();

    expect(appLookupPort.assertExists).toHaveBeenCalledWith(id.value);
  });

  it('should propagate errors from the app lookup port', async () => {
    appLookupPort.assertExists.mockRejectedValue(new Error('not found'));

    await expect(service.execute(UuidValueObject.generate())).rejects.toThrow(
      'not found',
    );
  });
});
