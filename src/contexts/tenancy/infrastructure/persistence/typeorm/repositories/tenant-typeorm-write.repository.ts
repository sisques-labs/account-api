import { TenantAggregate } from '@contexts/tenancy/domain/aggregates/tenant/tenant.aggregate';
import { ITenantWriteRepository } from '@contexts/tenancy/domain/repositories/write/tenant-write.repository';
import { TenantEntity } from '@contexts/tenancy/infrastructure/persistence/typeorm/entities/tenant.entity';
import { TenantTypeOrmMapper } from '@contexts/tenancy/infrastructure/persistence/typeorm/mappers/tenant-typeorm.mapper';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Criteria, PaginatedResult } from '@sisques-labs/nestjs-kit';
import { Repository } from 'typeorm';

@Injectable()
export class TenantTypeOrmWriteRepository implements ITenantWriteRepository {
  constructor(
    @InjectRepository(TenantEntity)
    private readonly repo: Repository<TenantEntity>,
    private readonly mapper: TenantTypeOrmMapper,
  ) {}

  async findById(id: string): Promise<TenantAggregate | null> {
    const entity = await this.repo.findOne({ where: { id } });
    return entity ? this.mapper.toAggregate(entity) : null;
  }

  async findByAppIdAndSlug(
    appId: string,
    slug: string,
  ): Promise<TenantAggregate | null> {
    const entity = await this.repo.findOne({ where: { appId, slug } });
    return entity ? this.mapper.toAggregate(entity) : null;
  }

  async findByCriteria(
    _criteria: Criteria,
  ): Promise<PaginatedResult<TenantAggregate>> {
    return new PaginatedResult<TenantAggregate>([], 0, 1, 10);
  }

  async save(tenant: TenantAggregate): Promise<TenantAggregate> {
    const entity = this.mapper.toEntity(tenant);
    const saved = await this.repo.save(entity);
    return this.mapper.toAggregate(saved);
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}
