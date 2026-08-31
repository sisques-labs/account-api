import { ITenantEventData } from '@contexts/tenancy/domain/events/interfaces/tenant-event-data.interface';
import { BaseEvent, IEventMetadata } from '@sisques-labs/nestjs-kit';

export class TenantCreatedEvent extends BaseEvent<ITenantEventData> {
  constructor(metadata: IEventMetadata, data: ITenantEventData) {
    super(metadata, data);
  }
}
