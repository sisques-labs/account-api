import { AppAggregate } from '@contexts/tenancy/domain/aggregates/app.aggregate';
import { AppBuilder } from '@contexts/tenancy/domain/builders/app.builder';
import { AppViewModel } from '@contexts/tenancy/domain/view-models/app.view-model';
import { AppEntity } from '@contexts/tenancy/infrastructure/persistence/typeorm/entities/app.entity';
import { Injectable } from '@nestjs/common';

@Injectable()
export class AppTypeOrmMapper {
  constructor(private readonly appBuilder: AppBuilder) {}

  public toAggregate(entity: AppEntity): AppAggregate {
    return this.appBuilder
      .withId(entity.id)
      .withSlug(entity.slug)
      .withName(entity.name)
      .withCreatedAt(entity.createdAt)
      .withUpdatedAt(entity.updatedAt)
      .build();
  }

  public toEntity(aggregate: AppAggregate): AppEntity {
    const primitives = aggregate.toPrimitives();
    const entity = new AppEntity();
    entity.id = primitives.id;
    entity.slug = primitives.slug;
    entity.name = primitives.name;
    entity.createdAt = primitives.createdAt;
    entity.updatedAt = primitives.updatedAt;
    return entity;
  }

  public toViewModel(entity: AppEntity): AppViewModel {
    return new AppViewModel({
      id: entity.id,
      slug: entity.slug,
      name: entity.name,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }
}
