import { IAppEventData } from '@contexts/app/domain/events/interfaces/app-event-data.interface';
import { BaseEvent, IEventMetadata } from '@sisques-labs/nestjs-kit';

export class AppCreatedEvent extends BaseEvent<IAppEventData> {
  constructor(metadata: IEventMetadata, data: IAppEventData) {
    super(metadata, data);
  }
}
