import { SessionAggregate } from '@contexts/auth/domain/aggregates/session.aggregate';
import { SessionBuilder } from '@contexts/auth/domain/builders/session.builder';
import { SessionEntity } from '@contexts/auth/infrastructure/persistence/typeorm/entities/session.entity';
import { Injectable } from '@nestjs/common';

@Injectable()
export class SessionTypeOrmMapper {
  constructor(private readonly sessionBuilder: SessionBuilder) {}

  public toAggregate(entity: SessionEntity): SessionAggregate {
    return this.sessionBuilder
      .withId(entity.id)
      .withUserId(entity.userId)
      .withRefreshTokenHash(entity.refreshTokenHash)
      .withExpiresAt(entity.refreshTokenExpiresAt)
      .withCreatedAt(entity.createdAt)
      .withUpdatedAt(entity.updatedAt)
      .build();
  }

  public toEntity(aggregate: SessionAggregate): SessionEntity {
    const primitives = aggregate.toPrimitives();
    const entity = new SessionEntity();
    entity.id = primitives.id;
    entity.userId = primitives.userId;
    entity.refreshTokenHash = primitives.refreshTokenHash;
    entity.refreshTokenExpiresAt = primitives.expiresAt;
    entity.createdAt = primitives.createdAt;
    entity.updatedAt = primitives.updatedAt;
    return entity;
  }
}
