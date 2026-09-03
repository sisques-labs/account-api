import { IUserEventData } from '@contexts/user/domain/events/interfaces/user-event-data.interface';
import { BaseEvent, IEventMetadata } from '@sisques-labs/nestjs-kit';

export class UserDeletedEvent extends BaseEvent<IUserEventData> {
  constructor(metadata: IEventMetadata, data: IUserEventData) {
    super(metadata, data);
  }
}
