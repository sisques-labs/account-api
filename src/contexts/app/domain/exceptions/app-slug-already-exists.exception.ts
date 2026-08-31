import { BaseException } from '@sisques-labs/nestjs-kit';

export class AppSlugAlreadyExistsException extends BaseException {
  constructor(slug: string) {
    super(`An app with slug "${slug}" already exists`);
  }
}
