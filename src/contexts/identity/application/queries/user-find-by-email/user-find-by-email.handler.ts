import { UserFindByEmailQuery } from '@contexts/identity/application/queries/user-find-by-email/user-find-by-email.query';
import {
  IUserReadRepository,
  USER_READ_REPOSITORY,
} from '@contexts/identity/domain/repositories/read/user-read.repository';
import { UserViewModel } from '@contexts/identity/domain/view-models/user.view-model';
import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

@QueryHandler(UserFindByEmailQuery)
export class UserFindByEmailQueryHandler implements IQueryHandler<UserFindByEmailQuery> {
  private readonly logger = new Logger(UserFindByEmailQueryHandler.name);

  constructor(
    @Inject(USER_READ_REPOSITORY)
    private readonly userReadRepository: IUserReadRepository,
  ) {}

  async execute(query: UserFindByEmailQuery): Promise<UserViewModel | null> {
    this.logger.log(`Finding user by email: ${query.email.value}`);
    return this.userReadRepository.findByEmail(query.email.value);
  }
}
