import { SessionAggregate } from '@contexts/auth/domain/aggregates/session.aggregate';
import { ISessionWriteRepository } from '@contexts/auth/domain/repositories/write/session-write.repository';
import { SessionEntity } from '@contexts/auth/infrastructure/persistence/typeorm/entities/session.entity';
import { SessionTypeOrmMapper } from '@contexts/auth/infrastructure/persistence/typeorm/mappers/session-typeorm.mapper';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Criteria, PaginatedResult } from '@sisques-labs/nestjs-kit';
import { Repository } from 'typeorm';

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
}
