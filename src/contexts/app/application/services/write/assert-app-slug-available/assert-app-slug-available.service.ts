import { AppSlugAlreadyExistsException } from '@contexts/app/domain/exceptions/app-slug-already-exists.exception';
import {
  APP_WRITE_REPOSITORY,
  IAppWriteRepository,
} from '@contexts/app/domain/repositories/write/app-write.repository';
import { AppSlugValueObject } from '@contexts/app/domain/value-objects/app-slug/app-slug.vo';
import { Inject, Injectable } from '@nestjs/common';
import { IBaseService } from '@sisques-labs/nestjs-kit';

@Injectable()
export class AssertAppSlugAvailableService implements IBaseService<
  AppSlugValueObject,
  void
> {
  constructor(
    @Inject(APP_WRITE_REPOSITORY)
    private readonly appWriteRepository: IAppWriteRepository,
  ) {}

  async execute(slug: AppSlugValueObject): Promise<void> {
    const existing = await this.appWriteRepository.findBySlug(slug.value);
    if (existing) throw new AppSlugAlreadyExistsException(slug.value);
  }
}
