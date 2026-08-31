import { IUserPrimitives } from '@contexts/user/domain/primitives/user.primitives';
import { BaseEvent, IEventMetadata } from '@sisques-labs/nestjs-kit';

export class UserUpdatedEvent extends BaseEvent<IUserPrimitives> {
  constructor(metadata: IEventMetadata, data: IUserPrimitives) {
    super(metadata, data);
  }
}
