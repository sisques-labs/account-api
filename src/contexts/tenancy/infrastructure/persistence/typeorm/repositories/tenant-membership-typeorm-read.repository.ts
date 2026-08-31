import { ITenantMembershipReadRepository } from '@contexts/tenancy/domain/repositories/read/tenant-membership-read.repository';
import { TenantMembershipViewModel } from '@contexts/tenancy/domain/view-models/tenant-membership.view-model';
import { TenantMembershipEntity } from '@contexts/tenancy/infrastructure/persistence/typeorm/entities/tenant-membership.entity';
import { TenantMembershipTypeOrmMapper } from '@contexts/tenancy/infrastructure/persistence/typeorm/mappers/tenant-membership-typeorm.mapper';
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

const ALIAS = 'tenant_membership';

@Injectable()
export class TenantMembershipTypeOrmReadRepository
  extends BaseDatabaseRepository
  implements ITenantMembershipReadRepository
{
  constructor(
    @InjectRepository(TenantMembershipEntity)
    private readonly repo: Repository<TenantMembershipEntity>,
    private readonly mapper: TenantMembershipTypeOrmMapper,
  ) {
    super();
  }

  async findById(id: string): Promise<TenantMembershipViewModel | null> {
    const entity = await this.repo.findOne({ where: { id } });
    return entity ? this.mapper.toViewModel(entity) : null;
  }

  async findAllByTenantId(
    tenantId: string,
  ): Promise<TenantMembershipViewModel[]> {
    const entities = await this.repo.find({ where: { tenantId } });
    return entities.map((entity) => this.mapper.toViewModel(entity));
  }

  async findAllByUserId(userId: string): Promise<TenantMembershipViewModel[]> {
    const entities = await this.repo.find({ where: { userId } });
    return entities.map((entity) => this.mapper.toViewModel(entity));
  }

  async findByCriteria(
    criteria: Criteria,
  ): Promise<PaginatedResult<TenantMembershipViewModel>> {
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

  async save(_viewModel: TenantMembershipViewModel): Promise<void> {
    throw new Error('Method not implemented.');
  }

  async delete(_id: string): Promise<void> {
    throw new Error('Method not implemented.');
  }
}
