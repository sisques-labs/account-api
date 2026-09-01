import { BasePrimitives } from '@sisques-labs/nestjs-kit';

export type ISessionPrimitives = BasePrimitives & {
  userId: string;
  refreshTokenHash: string;
  expiresAt: Date;
};
