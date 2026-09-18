import { SessionAggregate } from '@contexts/auth/domain/aggregates/session.aggregate';
import { IRotateResult } from '@contexts/auth/domain/interfaces/rotate-result.interface';
import { RotateSessionCallback } from '@contexts/auth/domain/interfaces/rotate-session-callback.interface';
import { ISessionWriteRepository } from '@contexts/auth/domain/repositories/write/session-write.repository';
import { SessionEntity } from '@contexts/auth/infrastructure/persistence/typeorm/entities/session.entity';
import { SessionTypeOrmMapper } from '@contexts/auth/infrastructure/persistence/typeorm/mappers/session-typeorm.mapper';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Criteria, PaginatedResult } from '@sisques-labs/nestjs-kit';
import { EntityManager, Repository } from 'typeorm';

@Injectable()
export class SessionTypeOrmWriteRepository implements ISessionWriteRepository {
  constructor(
    @InjectRepository(SessionEntity)
    private readonly repo: Repository<SessionEntity>,
    private readonly mapper: SessionTypeOrmMapper,
  ) {}

  async findById(id: string): Promise<SessionAggregate | null> {
    const entity = await this.repo.findOne({ where: { id } });
    return entity ? this.mapper.toAggregate(entity) : null;
  }

  async findByUserId(userId: string): Promise<SessionAggregate | null> {
    const entity = await this.repo.findOne({ where: { userId } });
    return entity ? this.mapper.toAggregate(entity) : null;
  }

  async findByRefreshTokenHash(hash: string): Promise<SessionAggregate | null> {
    const entity = await this.repo.findOne({
      where: { refreshTokenHash: hash },
    });
    return entity ? this.mapper.toAggregate(entity) : null;
  }

  async findByCriteria(
    _criteria: Criteria,
  ): Promise<PaginatedResult<SessionAggregate>> {
    return new PaginatedResult<SessionAggregate>([], 0, 1, 10);
  }

  async save(session: SessionAggregate): Promise<SessionAggregate> {
    const entity = this.mapper.toEntity(session);
    const saved = await this.repo.save(entity);
    return this.mapper.toAggregate(saved);
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  /**
   * Locks the session row for `refreshTokenHash` with `pessimistic_write`
   * (`SELECT ... FOR UPDATE`) and runs `callback` inside the same
   * transaction. The successor row is INSERTed before the predecessor's
   * `revoked_at`/`replaced_by_session_id` UPDATE — the self-referencing FK
   * on `replaced_by_session_id` rejects a reference to a row that does not
   * exist yet (gardenia-api's own documented ordering bug; do not repeat it
   * by updating the predecessor first).
   */
  async rotate(
    refreshTokenHash: string,
    callback: RotateSessionCallback,
  ): Promise<IRotateResult | null> {
    return this.repo.manager.transaction(async (manager) => {
      const currentEntity = await this.lockByRefreshTokenHash(
        manager,
        refreshTokenHash,
      );
      if (!currentEntity) return null;

      const current = this.mapper.toAggregate(currentEntity);

      const findLockedById = async (
        id: string,
      ): Promise<SessionAggregate | null> => {
        const entity = await this.lockById(manager, id);
        return entity ? this.mapper.toAggregate(entity) : null;
      };

      const { revoked, created } = await callback(current, findLockedById);

      const createdEntity = await manager.save(
        SessionEntity,
        this.mapper.toEntity(created),
      );
      const revokedEntity = await manager.save(
        SessionEntity,
        this.mapper.toEntity(revoked),
      );

      return {
        revoked: this.mapper.toAggregate(revokedEntity),
        created: this.mapper.toAggregate(createdEntity),
      };
    });
  }

  async revokeAllByUserId(userId: string): Promise<void> {
    await this.repo
      .createQueryBuilder()
      .update(SessionEntity)
      .set({ revokedAt: () => 'NOW()' })
      .where('user_id = :userId', { userId })
      .andWhere('revoked_at IS NULL')
      .execute();
  }

  private lockByRefreshTokenHash(
    manager: EntityManager,
    refreshTokenHash: string,
  ): Promise<SessionEntity | null> {
    return manager
      .createQueryBuilder(SessionEntity, 'session')
      .setLock('pessimistic_write')
      .where('session.refresh_token_hash = :refreshTokenHash', {
        refreshTokenHash,
      })
      .getOne();
  }

  private lockById(
    manager: EntityManager,
    id: string,
  ): Promise<SessionEntity | null> {
    return manager
      .createQueryBuilder(SessionEntity, 'session')
      .setLock('pessimistic_write')
      .where('session.id = :id', { id })
      .getOne();
  }
}
