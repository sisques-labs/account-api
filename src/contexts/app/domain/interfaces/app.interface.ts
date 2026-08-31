import { AppNameValueObject } from '@contexts/app/domain/value-objects/app-name/app-name.vo';
import { AppSlugValueObject } from '@contexts/app/domain/value-objects/app-slug/app-slug.vo';
import { DateValueObject, UuidValueObject } from '@sisques-labs/nestjs-kit';

export interface IApp {
  id: UuidValueObject;
  slug: AppSlugValueObject;
  name: AppNameValueObject;
  createdAt: DateValueObject;
  updatedAt: DateValueObject;
}
