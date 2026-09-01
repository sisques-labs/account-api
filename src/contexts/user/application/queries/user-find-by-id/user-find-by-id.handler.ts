import { UserFindByIdQuery } from '@contexts/user/application/queries/user-find-by-id/user-find-by-id.query';
import {
  IUserReadRepository,
  USER_READ_REPOSITORY,
} from '@contexts/user/domain/repositories/read/user-read.repository';
import { UserViewModel } from '@contexts/user/domain/view-models/user.view-model';
import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

@QueryHandler(UserFindByIdQuery)
export class UserFindByIdQueryHandler implements IQueryHandler<UserFindByIdQuery> {
  private readonly logger = new Logger(UserFindByIdQueryHandler.name);

  constructor(
    @Inject(USER_READ_REPOSITORY)
    private readonly userReadRepository: IUserReadRepository,
  ) {}

  async execute(query: UserFindByIdQuery): Promise<UserViewModel | null> {
    this.logger.log(`Finding user by id: ${query.userId.value}`);
    return this.userReadRepository.findById(query.userId.value);
  }
}
