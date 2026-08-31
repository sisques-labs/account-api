import { BasePrimitives } from '@sisques-labs/nestjs-kit';

export type IUserPrimitives = BasePrimitives & {
  externalId: string;
  email: string;
  displayName: string | null;
  platformAdmin: boolean;
};
