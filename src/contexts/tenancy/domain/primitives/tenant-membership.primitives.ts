import { BasePrimitives } from '@sisques-labs/nestjs-kit';

export type ITenantMembershipPrimitives = BasePrimitives & {
  tenantId: string;
  userId: string;
  role: string;
};
