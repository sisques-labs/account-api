import { UserAggregate } from '@contexts/identity/domain/aggregates/user.aggregate';
import { UserBuilder } from '@contexts/identity/domain/builders/user.builder';
import { UserViewModel } from '@contexts/identity/domain/view-models/user.view-model';
import { UserEntity } from '@contexts/identity/infrastructure/persistence/typeorm/entities/user.entity';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserTypeOrmMapper {
  constructor(private readonly userBuilder: UserBuilder) {}

  public toAggregate(entity: UserEntity): UserAggregate {
    return this.userBuilder
      .withId(entity.id)
      .withExternalId(entity.externalId)
      .withEmail(entity.email)
      .withDisplayName(entity.displayName)
      .withPlatformAdmin(entity.platformAdmin)
      .withRefreshTokenHash(entity.refreshTokenHash)
      .withRefreshTokenExpiresAt(entity.refreshTokenExpiresAt)
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
    entity.refreshTokenHash = primitives.refreshTokenHash;
    entity.refreshTokenExpiresAt = primitives.refreshTokenExpiresAt;
    entity.createdAt = primitives.createdAt;
    entity.updatedAt = primitives.updatedAt;
    return entity;
  }

  public toViewModel(entity: UserEntity): UserViewModel {
    return new UserViewModel({
      id: entity.id,
      externalId: entity.externalId,
      email: entity.email,
      displayName: entity.displayName,
      platformAdmin: entity.platformAdmin,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }
}
