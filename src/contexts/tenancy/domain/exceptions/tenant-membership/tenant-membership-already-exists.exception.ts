import { BaseException } from '@sisques-labs/nestjs-kit';

export class TenantMembershipAlreadyExistsException extends BaseException {
  constructor(tenantId: string, userId: string) {
    super(`User "${userId}" is already a member of tenant "${tenantId}"`);
  }
}
