import { CreateUserCommandHandler } from '@contexts/user/application/commands/create-user/create-user.handler';
import { UserFindByEmailQueryHandler } from '@contexts/user/application/queries/user-find-by-email/user-find-by-email.handler';
import { UserFindByIdQueryHandler } from '@contexts/user/application/queries/user-find-by-id/user-find-by-id.handler';
import { AssertUserEmailAvailableService } from '@contexts/user/application/services/write/assert-user-email-available/assert-user-email-available.service';
import { UserBuilder } from '@contexts/user/domain/builders/user.builder';
import { USER_READ_REPOSITORY } from '@contexts/user/domain/repositories/read/user-read.repository';
import { USER_WRITE_REPOSITORY } from '@contexts/user/domain/repositories/write/user-write.repository';
import { UserEntity } from '@contexts/user/infrastructure/persistence/typeorm/entities/user.entity';
import { UserTypeOrmMapper } from '@contexts/user/infrastructure/persistence/typeorm/mappers/user-typeorm.mapper';
import { UserTypeOrmReadRepository } from '@contexts/user/infrastructure/persistence/typeorm/repositories/user-typeorm-read.repository';
import { UserTypeOrmWriteRepository } from '@contexts/user/infrastructure/persistence/typeorm/repositories/user-typeorm-write.repository';
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';

const COMMAND_HANDLERS = [CreateUserCommandHandler];

const QUERY_HANDLERS = [UserFindByEmailQueryHandler, UserFindByIdQueryHandler];

const APPLICATION_SERVICES = [AssertUserEmailAvailableService];

const DOMAIN_BUILDERS = [UserBuilder];

const INFRASTRUCTURE_MAPPERS = [UserTypeOrmMapper];

const INFRASTRUCTURE_REPOSITORIES = [
  { provide: USER_WRITE_REPOSITORY, useClass: UserTypeOrmWriteRepository },
  { provide: USER_READ_REPOSITORY, useClass: UserTypeOrmReadRepository },
];

const INFRASTRUCTURE_ENTITIES = [UserEntity];

// No REST/GraphQL/MCP transport of its own — `auth` is the only public
// entry point that touches a user today (registration/login/refresh).
@Module({
  imports: [CqrsModule, TypeOrmModule.forFeature(INFRASTRUCTURE_ENTITIES)],
  providers: [
    ...COMMAND_HANDLERS,
    ...QUERY_HANDLERS,
    ...APPLICATION_SERVICES,
    ...DOMAIN_BUILDERS,
    ...INFRASTRUCTURE_MAPPERS,
    ...INFRASTRUCTURE_REPOSITORIES,
  ],
})
export class UserModule {}
