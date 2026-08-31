import { TenantMembershipAggregate } from '@contexts/tenancy/domain/aggregates/tenant-membership/tenant-membership.aggregate';
import { ITenantMembershipWriteRepository } from '@contexts/tenancy/domain/repositories/write/tenant-membership-write.repository';
import { TenantMembershipEntity } from '@contexts/tenancy/infrastructure/persistence/typeorm/entities/tenant-membership.entity';
import { TenantMembershipTypeOrmMapper } from '@contexts/tenancy/infrastructure/persistence/typeorm/mappers/tenant-membership-typeorm.mapper';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Criteria, PaginatedResult } from '@sisques-labs/nestjs-kit';
import { Repository } from 'typeorm';

@Injectable()
export class TenantMembershipTypeOrmWriteRepository implements ITenantMembershipWriteRepository {
  constructor(
    @InjectRepository(TenantMembershipEntity)
    private readonly repo: Repository<TenantMembershipEntity>,
    private readonly mapper: TenantMembershipTypeOrmMapper,
  ) {}

  async findById(id: string): Promise<TenantMembershipAggregate | null> {
    const entity = await this.repo.findOne({ where: { id } });
    return entity ? this.mapper.toAggregate(entity) : null;
  }

  async findByTenantIdAndUserId(
    tenantId: string,
    userId: string,
  ): Promise<TenantMembershipAggregate | null> {
    const entity = await this.repo.findOne({ where: { tenantId, userId } });
    return entity ? this.mapper.toAggregate(entity) : null;
  }

  async findByCriteria(
    _criteria: Criteria,
  ): Promise<PaginatedResult<TenantMembershipAggregate>> {
    return new PaginatedResult<TenantMembershipAggregate>([], 0, 1, 10);
  }

  async save(
    membership: TenantMembershipAggregate,
  ): Promise<TenantMembershipAggregate> {
    const entity = this.mapper.toEntity(membership);
    const saved = await this.repo.save(entity);
    return this.mapper.toAggregate(saved);
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  async deleteAllByTenantId(tenantId: string): Promise<void> {
    await this.repo.delete({ tenantId });
  }
}
