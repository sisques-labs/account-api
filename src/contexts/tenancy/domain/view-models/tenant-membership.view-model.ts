import { ITenantMembershipPrimitives } from '@contexts/tenancy/domain/primitives/tenant-membership.primitives';
import { BaseViewModel } from '@sisques-labs/nestjs-kit';

export class TenantMembershipViewModel extends BaseViewModel {
  public readonly tenantId: string;
  public readonly userId: string;
  public readonly role: string;

  constructor(props: ITenantMembershipPrimitives) {
    super(props.id, props.createdAt, props.updatedAt);
    this.tenantId = props.tenantId;
    this.userId = props.userId;
    this.role = props.role;
  }
}
