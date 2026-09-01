import { ITenantPrimitives } from '@contexts/tenancy/domain/primitives/tenant.primitives';
import { BaseViewModel } from '@sisques-labs/nestjs-kit';

export class TenantViewModel extends BaseViewModel {
  public readonly appId: string;
  public readonly name: string;
  public readonly slug: string;

  constructor(props: ITenantPrimitives) {
    super(props.id, props.createdAt, props.updatedAt);
    this.appId = props.appId;
    this.name = props.name;
    this.slug = props.slug;
  }
}
