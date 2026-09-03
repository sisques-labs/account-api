import { BaseException } from '@sisques-labs/nestjs-kit';

export class TenantSlugAlreadyExistsException extends BaseException {
  constructor(slug: string, appId: string) {
    super(`A tenant with slug "${slug}" already exists for app "${appId}"`);
  }
}
