import { UserAggregate } from '@contexts/user/domain/aggregates/user.aggregate';
import { UserBuilder } from '@contexts/user/domain/builders/user.builder';
import { UserViewModel } from '@contexts/user/domain/view-models/user.view-model';
import { UserEntity } from '@contexts/user/infrastructure/persistence/typeorm/entities/user.entity';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserTypeOrmMapper {
  constructor(private readonly userBuilder: UserBuilder) {}

  public toAggregate(entity: UserEntity): UserAggregate {
    return this.userBuilder
      .withId(entity.id)
      .withExternalId(entity.externalId)
      .withEmail(entity.email)
      .withDisplayName(entity.displayName ?? undefined)
      .withPlatformAdmin(entity.platformAdmin)
      .withCreatedAt(entity.createdAt)
      .withUpdatedAt(entity.updatedAt)
      .build();
  }

  public toEntity(aggregate: UserAggregate): UserEntity {
    const primitives = aggregate.toPrimitives();
    const entity = new UserEntity();
    entity.id = primitives.id;
    entity.externalId = primitives.externalId;
    entity.email = primitives.email;
    entity.displayName = primitives.displayName;
    entity.platformAdmin = primitives.platformAdmin;
    entity.createdAt = primitives.createdAt;
    entity.updatedAt = primitives.updatedAt;
    return entity;
  }

  public toViewModel(entity: UserEntity): UserViewModel {
    return this.userBuilder
      .withId(entity.id)
      .withExternalId(entity.externalId)
      .withEmail(entity.email)
      .withDisplayName(entity.displayName ?? undefined)
      .withPlatformAdmin(entity.platformAdmin)
      .withCreatedAt(entity.createdAt)
      .withUpdatedAt(entity.updatedAt)
      .buildViewModel();
  }
}
