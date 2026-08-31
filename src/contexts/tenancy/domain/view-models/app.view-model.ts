import { IAppPrimitives } from '@contexts/tenancy/domain/primitives/app.primitives';
import { BaseViewModel } from '@sisques-labs/nestjs-kit';

export class AppViewModel extends BaseViewModel {
  public readonly slug: string;
  public readonly name: string;

  constructor(props: IAppPrimitives) {
    super(props.id, props.createdAt, props.updatedAt);
    this.slug = props.slug;
    this.name = props.name;
  }
}
