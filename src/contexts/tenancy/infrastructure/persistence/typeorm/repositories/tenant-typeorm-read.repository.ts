import { ITenantReadRepository } from '@contexts/tenancy/domain/repositories/read/tenant-read.repository';
import { TenantViewModel } from '@contexts/tenancy/domain/view-models/tenant.view-model';
import { TenantEntity } from '@contexts/tenancy/infrastructure/persistence/typeorm/entities/tenant.entity';
import { TenantTypeOrmMapper } from '@contexts/tenancy/infrastructure/persistence/typeorm/mappers/tenant-typeorm.mapper';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  BaseDatabaseRepository,
  Criteria,
  PaginatedResult,
  SortDirection,
} from '@sisques-labs/nestjs-kit';
import { applyCriteriaToQueryBuilder } from '@sisques-labs/nestjs-kit/typeorm';
import { Repository } from 'typeorm';

const ALIAS = 'tenant';

@Injectable()
export class TenantTypeOrmReadRepository
  extends BaseDatabaseRepository
  implements ITenantReadRepository
{
  constructor(
    @InjectRepository(TenantEntity)
    private readonly repo: Repository<TenantEntity>,
    private readonly mapper: TenantTypeOrmMapper,
  ) {
    super();
  }

  async findById(id: string): Promise<TenantViewModel | null> {
    const entity = await this.repo.findOne({ where: { id } });
    return entity ? this.mapper.toViewModel(entity) : null;
  }

  async findByCriteria(
    criteria: Criteria,
  ): Promise<PaginatedResult<TenantViewModel>> {
    const { page, limit, skip } = await this.calculatePagination(criteria);

    const qb = this.repo.createQueryBuilder(ALIAS);

    applyCriteriaToQueryBuilder(qb, criteria, {
      alias: ALIAS,
      defaultSort: { field: 'createdAt', direction: SortDirection.DESC },
    });

    const [entities, total] = await qb.skip(skip).take(limit).getManyAndCount();

    return new PaginatedResult(
      entities.map((entity) => this.mapper.toViewModel(entity)),
      total,
      page,
      limit,
    );
  }

  async save(_viewModel: TenantViewModel): Promise<void> {
    throw new Error('Method not implemented.');
  }

  async delete(_id: string): Promise<void> {
    throw new Error('Method not implemented.');
  }
}
