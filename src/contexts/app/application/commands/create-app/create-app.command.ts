import { IAppPrimitives } from '@contexts/app/domain/primitives/app.primitives';
import { AppNameValueObject } from '@contexts/app/domain/value-objects/app-name/app-name.vo';
import { AppSlugValueObject } from '@contexts/app/domain/value-objects/app-slug/app-slug.vo';

export type CreateAppCommandInput = Pick<IAppPrimitives, 'slug' | 'name'>;

export class CreateAppCommand {
  public readonly slug: AppSlugValueObject;
  public readonly name: AppNameValueObject;

  constructor(input: CreateAppCommandInput) {
    this.slug = new AppSlugValueObject(input.slug);
    this.name = new AppNameValueObject(input.name);
  }
}
