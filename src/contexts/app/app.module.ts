import { CreateAppCommandHandler } from '@contexts/app/application/commands/create-app/create-app.handler';
import { AppFindByCriteriaQueryHandler } from '@contexts/app/application/queries/app-find-by-criteria/app-find-by-criteria.handler';
import { AppFindByIdQueryHandler } from '@contexts/app/application/queries/app-find-by-id/app-find-by-id.handler';
import { AssertAppExistsService } from '@contexts/app/application/services/write/assert-app-exists/assert-app-exists.service';
import { AssertAppSlugAvailableService } from '@contexts/app/application/services/write/assert-app-slug-available/assert-app-slug-available.service';
import { AppBuilder } from '@contexts/app/domain/builders/app.builder';
import { APP_READ_REPOSITORY } from '@contexts/app/domain/repositories/read/app-read.repository';
import { APP_WRITE_REPOSITORY } from '@contexts/app/domain/repositories/write/app-write.repository';
import { AppEntity } from '@contexts/app/infrastructure/persistence/typeorm/entities/app.entity';
import { AppTypeOrmMapper } from '@contexts/app/infrastructure/persistence/typeorm/mappers/app-typeorm.mapper';
import { AppTypeOrmReadRepository } from '@contexts/app/infrastructure/persistence/typeorm/repositories/app-typeorm-read.repository';
import { AppTypeOrmWriteRepository } from '@contexts/app/infrastructure/persistence/typeorm/repositories/app-typeorm-write.repository';
import { AppsController } from '@contexts/app/transport/rest/controllers/apps.controller';
import { AppRestMapper } from '@contexts/app/transport/rest/mappers/app/app.mapper';
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';

const COMMAND_HANDLERS = [CreateAppCommandHandler];

const QUERY_HANDLERS = [AppFindByCriteriaQueryHandler, AppFindByIdQueryHandler];

const APPLICATION_SERVICES = [
  AssertAppSlugAvailableService,
  AssertAppExistsService,
];

const DOMAIN_BUILDERS = [AppBuilder];

const INFRASTRUCTURE_MAPPERS = [AppTypeOrmMapper];

const INFRASTRUCTURE_REPOSITORIES = [
  { provide: APP_WRITE_REPOSITORY, useClass: AppTypeOrmWriteRepository },
  { provide: APP_READ_REPOSITORY, useClass: AppTypeOrmReadRepository },
];

const INFRASTRUCTURE_ENTITIES = [AppEntity];

const TRANSPORT_MAPPERS = [AppRestMapper];

const TRANSPORT_REST_CONTROLLERS = [AppsController];

@Module({
  imports: [
    CqrsModule,
    TypeOrmModule.forFeature(INFRASTRUCTURE_ENTITIES),
    // JwtAuthGuard/@CurrentUser come from the global `SecurityModule`
    // (imported once in CoreModule) — no per-context import needed.
  ],
  controllers: [...TRANSPORT_REST_CONTROLLERS],
  providers: [
    ...COMMAND_HANDLERS,
    ...QUERY_HANDLERS,
    ...APPLICATION_SERVICES,
    ...DOMAIN_BUILDERS,
    ...INFRASTRUCTURE_MAPPERS,
    ...INFRASTRUCTURE_REPOSITORIES,
    ...TRANSPORT_MAPPERS,
  ],
})
export class AppModule {}
