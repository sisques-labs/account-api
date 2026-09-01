import { BaseException } from '@sisques-labs/nestjs-kit';

export class TenantNotFoundException extends BaseException {
  constructor(identifier: string) {
    super(`Tenant "${identifier}" was not found`);
  }
}
