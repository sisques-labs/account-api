import {
  BaseEvent,
  IEventMetadata,
  IFieldChangedEventData,
} from '@sisques-labs/nestjs-kit';

export class TenantNameChangedEvent extends BaseEvent<
  IFieldChangedEventData<string | null>
> {
  constructor(
    metadata: IEventMetadata,
    data: IFieldChangedEventData<string | null>,
  ) {
    super(metadata, data);
  }
}
