import { BasePrimitives } from '@sisques-labs/nestjs-kit';

export type IUserPrimitives = BasePrimitives & {
  externalId: string;
  email: string;
  displayName: string;
  platformAdmin: boolean;
  refreshTokenHash: string | null;
  refreshTokenExpiresAt: Date | null;
};
