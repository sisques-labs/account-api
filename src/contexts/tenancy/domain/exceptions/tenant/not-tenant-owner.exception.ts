import { BaseException } from '@sisques-labs/nestjs-kit';

export class NotTenantOwnerException extends BaseException {
  constructor(tenantId: string, userId: string) {
    super(`User "${userId}" is not an owner of tenant "${tenantId}"`);
  }
}
