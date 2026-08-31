import { AppAggregate } from '@contexts/tenancy/domain/aggregates/app.aggregate';
import { IAppWriteRepository } from '@contexts/tenancy/domain/repositories/write/app-write.repository';
import { AppEntity } from '@contexts/tenancy/infrastructure/persistence/typeorm/entities/app.entity';
import { AppTypeOrmMapper } from '@contexts/tenancy/infrastructure/persistence/typeorm/mappers/app-typeorm.mapper';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Criteria, PaginatedResult } from '@sisques-labs/nestjs-kit';
import { Repository } from 'typeorm';

@Injectable()
export class AppTypeOrmWriteRepository implements IAppWriteRepository {
  constructor(
    @InjectRepository(AppEntity)
    private readonly repo: Repository<AppEntity>,
    private readonly mapper: AppTypeOrmMapper,
  ) {}

  async findById(id: string): Promise<AppAggregate | null> {
    const entity = await this.repo.findOne({ where: { id } });
    return entity ? this.mapper.toAggregate(entity) : null;
  }

  async findBySlug(slug: string): Promise<AppAggregate | null> {
    const entity = await this.repo.findOne({ where: { slug } });
    return entity ? this.mapper.toAggregate(entity) : null;
  }

  async findByCriteria(
    _criteria: Criteria,
  ): Promise<PaginatedResult<AppAggregate>> {
    return new PaginatedResult<AppAggregate>([], 0, 1, 10);
  }

  async save(app: AppAggregate): Promise<AppAggregate> {
    const entity = this.mapper.toEntity(app);
    const saved = await this.repo.save(entity);
    return this.mapper.toAggregate(saved);
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}
