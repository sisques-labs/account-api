import { IUserReadRepository } from '@contexts/user/domain/repositories/read/user-read.repository';
import { UserViewModel } from '@contexts/user/domain/view-models/user.view-model';
import { UserEntity } from '@contexts/user/infrastructure/persistence/typeorm/entities/user.entity';
import { UserTypeOrmMapper } from '@contexts/user/infrastructure/persistence/typeorm/mappers/user-typeorm.mapper';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  BaseDatabaseRepository,
  Criteria,
  PaginatedResult,
} from '@sisques-labs/nestjs-kit';
import { Repository } from 'typeorm';

@Injectable()
export class UserTypeOrmReadRepository
  extends BaseDatabaseRepository
  implements IUserReadRepository
{
  constructor(
    @InjectRepository(UserEntity)
    private readonly repo: Repository<UserEntity>,
    private readonly mapper: UserTypeOrmMapper,
  ) {
    super();
  }

  async findById(id: string): Promise<UserViewModel | null> {
    const entity = await this.repo.findOne({ where: { id } });
    return entity ? this.mapper.toViewModel(entity) : null;
  }

  async findByEmail(email: string): Promise<UserViewModel | null> {
    const entity = await this.repo.findOne({ where: { email } });
    return entity ? this.mapper.toViewModel(entity) : null;
  }

  async findByCriteria(
    criteria: Criteria,
  ): Promise<PaginatedResult<UserViewModel>> {
    const { page, limit, skip } = await this.calculatePagination(criteria);

    const [entities, total] = await this.repo.findAndCount({
      skip,
      take: limit,
      order: this.buildTypeOrmOrder(criteria),
    });

    return new PaginatedResult(
      entities.map((entity) => this.mapper.toViewModel(entity)),
      total,
      page,
      limit,
    );
  }

  async save(_viewModel: UserViewModel): Promise<void> {
    throw new Error('Method not implemented.');
  }

  async delete(_id: string): Promise<void> {
    throw new Error('Method not implemented.');
  }
}
