import { AppAggregate } from '@contexts/app/domain/aggregates/app/app.aggregate';
import { AppViewModel } from '@contexts/app/domain/view-models/app.view-model';
import { AppNameValueObject } from '@contexts/app/domain/value-objects/app-name/app-name.vo';
import { AppSlugValueObject } from '@contexts/app/domain/value-objects/app-slug/app-slug.vo';
import { Injectable } from '@nestjs/common';
import {
  BaseBuilder,
  DateValueObject,
  FieldIsRequiredException,
  UuidValueObject,
} from '@sisques-labs/nestjs-kit';

@Injectable()
export class AppBuilder extends BaseBuilder<AppAggregate, AppViewModel> {
  private _slug!: string;
  private _name!: string;

  withSlug(slug: string): this {
    this._slug = slug;
    return this;
  }

  withName(name: string): this {
    this._name = name;
    return this;
  }

  public override validate(): void {
    super.validate();
    if (!this._slug) throw new FieldIsRequiredException('slug');
    if (!this._name) throw new FieldIsRequiredException('name');
  }

  public override build(): AppAggregate {
    this.validate();

    return new AppAggregate({
      id: new UuidValueObject(this._id),
      slug: new AppSlugValueObject(this._slug),
      name: new AppNameValueObject(this._name),
      createdAt: new DateValueObject(this._createdAt ?? new Date()),
      updatedAt: new DateValueObject(this._updatedAt ?? new Date()),
    });
  }

  public override buildViewModel(): AppViewModel {
    this.validate();

    return new AppViewModel({
      id: this._id,
      slug: this._slug,
      name: this._name,
      createdAt: this._createdAt ?? new Date(),
      updatedAt: this._updatedAt ?? new Date(),
    });
  }
}
