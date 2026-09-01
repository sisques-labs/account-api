import {
  BaseEvent,
  IEventMetadata,
  IFieldChangedEventData,
} from '@sisques-labs/nestjs-kit';

export class UserPlatformAdminChangedEvent extends BaseEvent<
  IFieldChangedEventData<boolean>
> {
  constructor(metadata: IEventMetadata, data: IFieldChangedEventData<boolean>) {
    super(metadata, data);
  }
}
