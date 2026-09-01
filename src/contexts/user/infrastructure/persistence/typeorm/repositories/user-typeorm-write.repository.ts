import { UserAggregate } from '@contexts/user/domain/aggregates/user.aggregate';
import { IUserWriteRepository } from '@contexts/user/domain/repositories/write/user-write.repository';
import { UserEntity } from '@contexts/user/infrastructure/persistence/typeorm/entities/user.entity';
import { UserTypeOrmMapper } from '@contexts/user/infrastructure/persistence/typeorm/mappers/user-typeorm.mapper';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Criteria, PaginatedResult } from '@sisques-labs/nestjs-kit';
import { Repository } from 'typeorm';

@Injectable()
export class UserTypeOrmWriteRepository implements IUserWriteRepository {
  constructor(
    @InjectRepository(UserEntity)
    private readonly repo: Repository<UserEntity>,
    private readonly mapper: UserTypeOrmMapper,
  ) {}

  async findById(id: string): Promise<UserAggregate | null> {
    const entity = await this.repo.findOne({ where: { id } });
    return entity ? this.mapper.toAggregate(entity) : null;
  }

  async findByEmail(email: string): Promise<UserAggregate | null> {
    const entity = await this.repo.findOne({ where: { email } });
    return entity ? this.mapper.toAggregate(entity) : null;
  }

  async findByExternalId(externalId: string): Promise<UserAggregate | null> {
    const entity = await this.repo.findOne({ where: { externalId } });
    return entity ? this.mapper.toAggregate(entity) : null;
  }

  async findByCriteria(
    _criteria: Criteria,
  ): Promise<PaginatedResult<UserAggregate>> {
    return new PaginatedResult<UserAggregate>([], 0, 1, 10);
  }

  async save(user: UserAggregate): Promise<UserAggregate> {
    const entity = this.mapper.toEntity(user);
    const saved = await this.repo.save(entity);
    return this.mapper.toAggregate(saved);
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}
