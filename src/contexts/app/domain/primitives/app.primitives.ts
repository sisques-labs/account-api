import { BasePrimitives } from '@sisques-labs/nestjs-kit';

export type IAppPrimitives = BasePrimitives & {
  slug: string;
  name: string;
};
