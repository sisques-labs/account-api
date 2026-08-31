import { TenantMembershipAggregate } from '@contexts/tenancy/domain/aggregates/tenant-membership/tenant-membership.aggregate';
import { TenantMembershipBuilder } from '@contexts/tenancy/domain/builders/tenant-membership.builder';
import { TenantMembershipViewModel } from '@contexts/tenancy/domain/view-models/tenant-membership.view-model';
import { TenantMembershipEntity } from '@contexts/tenancy/infrastructure/persistence/typeorm/entities/tenant-membership.entity';
import { Injectable } from '@nestjs/common';

@Injectable()
export class TenantMembershipTypeOrmMapper {
  constructor(
    private readonly tenantMembershipBuilder: TenantMembershipBuilder,
  ) {}

  public toAggregate(
    entity: TenantMembershipEntity,
  ): TenantMembershipAggregate {
    return this.tenantMembershipBuilder
      .withId(entity.id)
      .withTenantId(entity.tenantId)
      .withUserId(entity.userId)
      .withRole(entity.role)
      .withCreatedAt(entity.createdAt)
      .withUpdatedAt(entity.updatedAt)
      .build();
  }

  public toEntity(
    aggregate: TenantMembershipAggregate,
  ): TenantMembershipEntity {
    const primitives = aggregate.toPrimitives();
    const entity = new TenantMembershipEntity();
    entity.id = primitives.id;
    entity.tenantId = primitives.tenantId;
    entity.userId = primitives.userId;
    entity.role = primitives.role;
    entity.createdAt = primitives.createdAt;
    entity.updatedAt = primitives.updatedAt;
    return entity;
  }

  public toViewModel(
    entity: TenantMembershipEntity,
  ): TenantMembershipViewModel {
    return new TenantMembershipViewModel({
      id: entity.id,
      tenantId: entity.tenantId,
      userId: entity.userId,
      role: entity.role,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }
}
