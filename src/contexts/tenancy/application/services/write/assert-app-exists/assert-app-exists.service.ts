import {
  APP_LOOKUP_PORT,
  IAppLookupPort,
} from '@contexts/tenancy/application/ports/app-lookup.port';
import { Inject, Injectable } from '@nestjs/common';
import { IBaseService, UuidValueObject } from '@sisques-labs/nestjs-kit';

@Injectable()
export class AssertAppExistsService implements IBaseService<
  UuidValueObject,
  void
> {
  constructor(
    @Inject(APP_LOOKUP_PORT)
    private readonly appLookupPort: IAppLookupPort,
  ) {}

  async execute(id: UuidValueObject): Promise<void> {
    await this.appLookupPort.assertExists(id.value);
  }
}
