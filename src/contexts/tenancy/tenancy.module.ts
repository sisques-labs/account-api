import { AddTenantMemberCommandHandler } from '@contexts/tenancy/application/commands/add-tenant-member/add-tenant-member.handler';
import { CreateTenantCommandHandler } from '@contexts/tenancy/application/commands/create-tenant/create-tenant.handler';
import { APP_LOOKUP_PORT } from '@contexts/tenancy/application/ports/app-lookup.port';
import { USER_LOOKUP_PORT } from '@contexts/tenancy/application/ports/user-lookup.port';
import { TenantMembershipFindByTenantIdQueryHandler } from '@contexts/tenancy/application/queries/tenant-membership-find-by-tenant-id/tenant-membership-find-by-tenant-id.handler';
import { TenantMembershipFindByUserIdQueryHandler } from '@contexts/tenancy/application/queries/tenant-membership-find-by-user-id/tenant-membership-find-by-user-id.handler';
import { AssertAppExistsService } from '@contexts/tenancy/application/services/write/assert-app-exists/assert-app-exists.service';
import { AssertTenantExistsService } from '@contexts/tenancy/application/services/write/assert-tenant-exists/assert-tenant-exists.service';
import { AssertTenantMembershipAvailableService } from '@contexts/tenancy/application/services/write/assert-tenant-membership-available/assert-tenant-membership-available.service';
import { AssertTenantSlugAvailableService } from '@contexts/tenancy/application/services/write/assert-tenant-slug-available/assert-tenant-slug-available.service';
import { TenantBuilder } from '@contexts/tenancy/domain/builders/tenant/tenant.builder';
import { TenantMembershipBuilder } from '@contexts/tenancy/domain/builders/tenant-membership/tenant-membership.builder';
import { TENANT_MEMBERSHIP_READ_REPOSITORY } from '@contexts/tenancy/domain/repositories/read/tenant-membership-read.repository';
import { TENANT_WRITE_REPOSITORY } from '@contexts/tenancy/domain/repositories/write/tenant-write.repository';
import { TENANT_MEMBERSHIP_WRITE_REPOSITORY } from '@contexts/tenancy/domain/repositories/write/tenant-membership-write.repository';
import { AppLookupAdapter } from '@contexts/tenancy/infrastructure/adapters/app-lookup.adapter';
import { UserLookupAdapter } from '@contexts/tenancy/infrastructure/adapters/user-lookup.adapter';
import { TenantEntity } from '@contexts/tenancy/infrastructure/persistence/typeorm/entities/tenant.entity';
import { TenantMembershipEntity } from '@contexts/tenancy/infrastructure/persistence/typeorm/entities/tenant-membership.entity';
import { TenantTypeOrmMapper } from '@contexts/tenancy/infrastructure/persistence/typeorm/mappers/tenant-typeorm.mapper';
import { TenantMembershipTypeOrmMapper } from '@contexts/tenancy/infrastructure/persistence/typeorm/mappers/tenant-membership-typeorm.mapper';
import { TenantTypeOrmWriteRepository } from '@contexts/tenancy/infrastructure/persistence/typeorm/repositories/tenant-typeorm-write.repository';
import { TenantMembershipTypeOrmReadRepository } from '@contexts/tenancy/infrastructure/persistence/typeorm/repositories/tenant-membership-typeorm-read.repository';
import { TenantMembershipTypeOrmWriteRepository } from '@contexts/tenancy/infrastructure/persistence/typeorm/repositories/tenant-membership-typeorm-write.repository';
import { TenantsController } from '@contexts/tenancy/transport/rest/controllers/tenants.controller';
import { TenantMembershipRestMapper } from '@contexts/tenancy/transport/rest/mappers/tenant-membership/tenant-membership.mapper';
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';

const COMMAND_HANDLERS = [
  CreateTenantCommandHandler,
  AddTenantMemberCommandHandler,
];

const QUERY_HANDLERS = [
  TenantMembershipFindByTenantIdQueryHandler,
  TenantMembershipFindByUserIdQueryHandler,
];

const APPLICATION_SERVICES = [
  AssertAppExistsService,
  AssertTenantSlugAvailableService,
  AssertTenantExistsService,
  AssertTenantMembershipAvailableService,
];

const DOMAIN_BUILDERS = [TenantBuilder, TenantMembershipBuilder];

const INFRASTRUCTURE_MAPPERS = [
  TenantTypeOrmMapper,
  TenantMembershipTypeOrmMapper,
];

const INFRASTRUCTURE_REPOSITORIES = [
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

const INFRASTRUCTURE_ENTITIES = [TenantEntity, TenantMembershipEntity];

const INFRASTRUCTURE_ADAPTERS = [
  { provide: APP_LOOKUP_PORT, useClass: AppLookupAdapter },
  { provide: USER_LOOKUP_PORT, useClass: UserLookupAdapter },
];

const TRANSPORT_MAPPERS = [TenantMembershipRestMapper];

const TRANSPORT_REST_CONTROLLERS = [TenantsController];

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
