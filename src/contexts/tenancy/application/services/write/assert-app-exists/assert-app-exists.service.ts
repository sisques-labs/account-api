import { AppAggregate } from '@contexts/tenancy/domain/aggregates/app.aggregate';
import { AppNotFoundException } from '@contexts/tenancy/domain/exceptions/app-not-found.exception';
import {
  APP_WRITE_REPOSITORY,
  IAppWriteRepository,
} from '@contexts/tenancy/domain/repositories/write/app-write.repository';
import { Inject, Injectable } from '@nestjs/common';
import { IBaseService, UuidValueObject } from '@sisques-labs/nestjs-kit';

@Injectable()
export class AssertAppExistsService implements IBaseService {
  constructor(
    @Inject(APP_WRITE_REPOSITORY)
    private readonly appWriteRepository: IAppWriteRepository,
  ) {}

  async execute(id: UuidValueObject): Promise<AppAggregate> {
    const app = await this.appWriteRepository.findById(id.value);
    if (!app) throw new AppNotFoundException(id.value);
    return app;
  }
}
