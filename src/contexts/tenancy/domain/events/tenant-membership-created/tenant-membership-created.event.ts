import { ITenantMembershipEventData } from '@contexts/tenancy/domain/events/interfaces/tenant-membership-event-data.interface';
import { BaseEvent, IEventMetadata } from '@sisques-labs/nestjs-kit';

export class TenantMembershipCreatedEvent extends BaseEvent<ITenantMembershipEventData> {
  constructor(metadata: IEventMetadata, data: ITenantMembershipEventData) {
    super(metadata, data);
  }
}
