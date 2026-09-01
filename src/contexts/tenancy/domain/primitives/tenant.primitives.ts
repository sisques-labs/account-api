import { BasePrimitives } from '@sisques-labs/nestjs-kit';

export type ITenantPrimitives = BasePrimitives & {
  appId: string;
  name: string;
  slug: string;
};
