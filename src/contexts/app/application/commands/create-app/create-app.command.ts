import { IAppPrimitives } from '@contexts/app/domain/primitives/app.primitives';
import { AppNameValueObject } from '@contexts/app/domain/value-objects/app-name/app-name.vo';
import { AppSlugValueObject } from '@contexts/app/domain/value-objects/app-slug/app-slug.vo';

export type CreateAppCommandInput = Pick<IAppPrimitives, 'name'> & {
  slug?: IAppPrimitives['slug'];
};

export class CreateAppCommand {
  public readonly slug: AppSlugValueObject;
  public readonly name: AppNameValueObject;

  constructor(input: CreateAppCommandInput) {
    this.name = new AppNameValueObject(input.name);
    this.slug = input.slug
      ? new AppSlugValueObject(input.slug)
      : new AppSlugValueObject(
          AppSlugValueObject.generateSlug(this.name.value),
        );
  }
}
