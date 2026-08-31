import { IAppReadRepository } from '@contexts/app/domain/repositories/read/app-read.repository';
import { AppViewModel } from '@contexts/app/domain/view-models/app.view-model';
import { AppEntity } from '@contexts/app/infrastructure/persistence/typeorm/entities/app.entity';
import { AppTypeOrmMapper } from '@contexts/app/infrastructure/persistence/typeorm/mappers/app-typeorm.mapper';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  BaseDatabaseRepository,
  Criteria,
  PaginatedResult,
} from '@sisques-labs/nestjs-kit';
import { Repository } from 'typeorm';

@Injectable()
export class AppTypeOrmReadRepository
  extends BaseDatabaseRepository
  implements IAppReadRepository
{
  constructor(
    @InjectRepository(AppEntity)
    private readonly repo: Repository<AppEntity>,
    private readonly mapper: AppTypeOrmMapper,
  ) {
    super();
  }

  async findById(id: string): Promise<AppViewModel | null> {
    const entity = await this.repo.findOne({ where: { id } });
    return entity ? this.mapper.toViewModel(entity) : null;
  }

  async findByCriteria(
    criteria: Criteria,
  ): Promise<PaginatedResult<AppViewModel>> {
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

  async save(_viewModel: AppViewModel): Promise<void> {
    throw new Error('Method not implemented.');
  }

  async delete(_id: string): Promise<void> {
    throw new Error('Method not implemented.');
  }
}
