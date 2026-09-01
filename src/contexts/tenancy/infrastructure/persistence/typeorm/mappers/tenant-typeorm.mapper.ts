import { TenantAggregate } from '@contexts/tenancy/domain/aggregates/tenant/tenant.aggregate';
import { TenantBuilder } from '@contexts/tenancy/domain/builders/tenant/tenant.builder';
import { TenantViewModel } from '@contexts/tenancy/domain/view-models/tenant.view-model';
import { TenantEntity } from '@contexts/tenancy/infrastructure/persistence/typeorm/entities/tenant.entity';
import { Injectable } from '@nestjs/common';

@Injectable()
export class TenantTypeOrmMapper {
  constructor(private readonly tenantBuilder: TenantBuilder) {}

  public toAggregate(entity: TenantEntity): TenantAggregate {
    return this.tenantBuilder
      .withId(entity.id)
      .withAppId(entity.appId)
      .withName(entity.name)
      .withSlug(entity.slug)
      .withCreatedAt(entity.createdAt)
      .withUpdatedAt(entity.updatedAt)
      .build();
  }

  public toEntity(aggregate: TenantAggregate): TenantEntity {
    const primitives = aggregate.toPrimitives();
    const entity = new TenantEntity();
    entity.id = primitives.id;
    entity.appId = primitives.appId;
    entity.name = primitives.name;
    entity.slug = primitives.slug;
    entity.createdAt = primitives.createdAt;
    entity.updatedAt = primitives.updatedAt;
    return entity;
  }

  public toViewModel(entity: TenantEntity): TenantViewModel {
    return this.tenantBuilder
      .withId(entity.id)
      .withAppId(entity.appId)
      .withName(entity.name)
      .withSlug(entity.slug)
      .withCreatedAt(entity.createdAt)
      .withUpdatedAt(entity.updatedAt)
      .buildViewModel();
  }
}
