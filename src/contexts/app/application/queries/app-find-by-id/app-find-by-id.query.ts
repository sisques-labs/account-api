import { IAppPrimitives } from '@contexts/app/domain/primitives/app.primitives';
import { UuidValueObject } from '@sisques-labs/nestjs-kit';

export type AppFindByIdQueryInput = Pick<IAppPrimitives, 'id'>;

export class AppFindByIdQuery {
  public readonly id: UuidValueObject;

  constructor(input: AppFindByIdQueryInput) {
    this.id = new UuidValueObject(input.id);
  }
}
