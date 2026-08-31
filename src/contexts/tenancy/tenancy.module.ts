import { AddTenantMemberCommandHandler } from '@contexts/tenancy/application/commands/add-tenant-member/add-tenant-member.handler';
import { CreateAppCommandHandler } from '@contexts/tenancy/application/commands/create-app/create-app.handler';
import { CreateTenantCommandHandler } from '@contexts/tenancy/application/commands/create-tenant/create-tenant.handler';
import { USER_LOOKUP_PORT } from '@contexts/tenancy/application/ports/user-lookup.port';
import { AppFindAllQueryHandler } from '@contexts/tenancy/application/queries/app-find-all/app-find-all.handler';
import { TenantMembershipFindByTenantIdQueryHandler } from '@contexts/tenancy/application/queries/tenant-membership-find-by-tenant-id/tenant-membership-find-by-tenant-id.handler';
import { TenantMembershipFindByUserIdQueryHandler } from '@contexts/tenancy/application/queries/tenant-membership-find-by-user-id/tenant-membership-find-by-user-id.handler';
import { AssertAppExistsService } from '@contexts/tenancy/application/services/write/assert-app-exists/assert-app-exists.service';
import { AssertAppSlugAvailableService } from '@contexts/tenancy/application/services/write/assert-app-slug-available/assert-app-slug-available.service';
import { AssertTenantExistsService } from '@contexts/tenancy/application/services/write/assert-tenant-exists/assert-tenant-exists.service';
import { AssertTenantMembershipAvailableService } from '@contexts/tenancy/application/services/write/assert-tenant-membership-available/assert-tenant-membership-available.service';
import { AssertTenantSlugAvailableService } from '@contexts/tenancy/application/services/write/assert-tenant-slug-available/assert-tenant-slug-available.service';
import { AppBuilder } from '@contexts/tenancy/domain/builders/app.builder';
import { TenantBuilder } from '@contexts/tenancy/domain/builders/tenant.builder';
import { TenantMembershipBuilder } from '@contexts/tenancy/domain/builders/tenant-membership.builder';
import { APP_READ_REPOSITORY } from '@contexts/tenancy/domain/repositories/read/app-read.repository';
import { TENANT_MEMBERSHIP_READ_REPOSITORY } from '@contexts/tenancy/domain/repositories/read/tenant-membership-read.repository';
import { APP_WRITE_REPOSITORY } from '@contexts/tenancy/domain/repositories/write/app-write.repository';
import { TENANT_WRITE_REPOSITORY } from '@contexts/tenancy/domain/repositories/write/tenant-write.repository';
import { TENANT_MEMBERSHIP_WRITE_REPOSITORY } from '@contexts/tenancy/domain/repositories/write/tenant-membership-write.repository';
import { UserLookupAdapter } from '@contexts/tenancy/infrastructure/adapters/user-lookup.adapter';
import { AppEntity } from '@contexts/tenancy/infrastructure/persistence/typeorm/entities/app.entity';
import { TenantEntity } from '@contexts/tenancy/infrastructure/persistence/typeorm/entities/tenant.entity';
import { TenantMembershipEntity } from '@contexts/tenancy/infrastructure/persistence/typeorm/entities/tenant-membership.entity';
import { AppTypeOrmMapper } from '@contexts/tenancy/infrastructure/persistence/typeorm/mappers/app-typeorm.mapper';
import { TenantTypeOrmMapper } from '@contexts/tenancy/infrastructure/persistence/typeorm/mappers/tenant-typeorm.mapper';
import { TenantMembershipTypeOrmMapper } from '@contexts/tenancy/infrastructure/persistence/typeorm/mappers/tenant-membership-typeorm.mapper';
import { AppTypeOrmReadRepository } from '@contexts/tenancy/infrastructure/persistence/typeorm/repositories/app-typeorm-read.repository';
import { AppTypeOrmWriteRepository } from '@contexts/tenancy/infrastructure/persistence/typeorm/repositories/app-typeorm-write.repository';
import { TenantTypeOrmWriteRepository } from '@contexts/tenancy/infrastructure/persistence/typeorm/repositories/tenant-typeorm-write.repository';
import { TenantMembershipTypeOrmReadRepository } from '@contexts/tenancy/infrastructure/persistence/typeorm/repositories/tenant-membership-typeorm-read.repository';
import { TenantMembershipTypeOrmWriteRepository } from '@contexts/tenancy/infrastructure/persistence/typeorm/repositories/tenant-membership-typeorm-write.repository';
import { AppsController } from '@contexts/tenancy/transport/rest/controllers/apps.controller';
import { TenantsController } from '@contexts/tenancy/transport/rest/controllers/tenants.controller';
import { AppRestMapper } from '@contexts/tenancy/transport/rest/mappers/app/app.mapper';
import { TenantMembershipRestMapper } from '@contexts/tenancy/transport/rest/mappers/tenant-membership/tenant-membership.mapper';
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';

const COMMAND_HANDLERS = [
  CreateAppCommandHandler,
  CreateTenantCommandHandler,
  AddTenantMemberCommandHandler,
];

const QUERY_HANDLERS = [
  AppFindAllQueryHandler,
  TenantMembershipFindByTenantIdQueryHandler,
  TenantMembershipFindByUserIdQueryHandler,
];

const APPLICATION_SERVICES = [
  AssertAppSlugAvailableService,
  AssertAppExistsService,
  AssertTenantSlugAvailableService,
  AssertTenantExistsService,
  AssertTenantMembershipAvailableService,
];

const DOMAIN_BUILDERS = [AppBuilder, TenantBuilder, TenantMembershipBuilder];

const INFRASTRUCTURE_MAPPERS = [
  AppTypeOrmMapper,
  TenantTypeOrmMapper,
  TenantMembershipTypeOrmMapper,
];

const INFRASTRUCTURE_REPOSITORIES = [
  { provide: APP_WRITE_REPOSITORY, useClass: AppTypeOrmWriteRepository },
  { provide: APP_READ_REPOSITORY, useClass: AppTypeOrmReadRepository },
  { provide: TENANT_WRITE_REPOSITORY, useClass: TenantTypeOrmWriteRepository },
  {
    provide: TENANT_MEMBERSHIP_WRITE_REPOSITORY,
    useClass: TenantMembershipTypeOrmWriteRepository,
  },
  {
    provide: TENANT_MEMBERSHIP_READ_REPOSITORY,
    useClass: TenantMembershipTypeOrmReadRepository,
  },
];

const INFRASTRUCTURE_ENTITIES = [
  AppEntity,
  TenantEntity,
  TenantMembershipEntity,
];

const INFRASTRUCTURE_ADAPTERS = [
  { provide: USER_LOOKUP_PORT, useClass: UserLookupAdapter },
];

const TRANSPORT_MAPPERS = [AppRestMapper, TenantMembershipRestMapper];

const TRANSPORT_REST_CONTROLLERS = [AppsController, TenantsController];

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
    ...INFRASTRUCTURE_ADAPTERS,
    ...TRANSPORT_MAPPERS,
  ],
})
export class TenancyModule {}
