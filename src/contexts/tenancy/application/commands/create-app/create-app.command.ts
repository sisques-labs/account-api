import { AppNameValueObject } from '@contexts/tenancy/domain/value-objects/app-name/app-name.vo';
import { AppSlugValueObject } from '@contexts/tenancy/domain/value-objects/app-slug/app-slug.vo';

export interface CreateAppCommandInput {
  slug: string;
  name: string;
}

export class CreateAppCommand {
  public readonly slug: AppSlugValueObject;
  public readonly name: AppNameValueObject;

  constructor(input: CreateAppCommandInput) {
    this.slug = new AppSlugValueObject(input.slug);
    this.name = new AppNameValueObject(input.name);
  }
}
