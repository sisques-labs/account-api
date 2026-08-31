import { AppNameValueObject } from '@contexts/app/domain/value-objects/app-name/app-name.vo';
import { AppSlugValueObject } from '@contexts/app/domain/value-objects/app-slug/app-slug.vo';
import { IBaseAggregate } from '@sisques-labs/nestjs-kit';

export interface IApp extends IBaseAggregate {
  slug: AppSlugValueObject;
  name: AppNameValueObject;
}
