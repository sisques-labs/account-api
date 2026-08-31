import { LoginUserCommandHandler } from '@contexts/identity/application/commands/login-user/login-user.handler';
import { RefreshSessionCommandHandler } from '@contexts/identity/application/commands/refresh-session/refresh-session.handler';
import { RegisterUserCommandHandler } from '@contexts/identity/application/commands/register-user/register-user.handler';
import { IDENTITY_PROVIDER_PORT } from '@contexts/identity/application/ports/identity-provider.port';
import { TENANT_MEMBERSHIP_LOOKUP_PORT } from '@contexts/identity/application/ports/tenant-membership-lookup.port';
import { UserFindByEmailQueryHandler } from '@contexts/identity/application/queries/user-find-by-email/user-find-by-email.handler';
import { TokenService } from '@contexts/identity/application/services/token.service';
import { AssertUserEmailAvailableService } from '@contexts/identity/application/services/write/assert-user-email-available/assert-user-email-available.service';
import { GenerateRefreshTokenService } from '@contexts/identity/application/services/write/generate-refresh-token/generate-refresh-token.service';
import { HashRefreshTokenService } from '@contexts/identity/application/services/write/hash-refresh-token/hash-refresh-token.service';
import { UserBuilder } from '@contexts/identity/domain/builders/user.builder';
import { USER_READ_REPOSITORY } from '@contexts/identity/domain/repositories/read/user-read.repository';
import { USER_WRITE_REPOSITORY } from '@contexts/identity/domain/repositories/write/user-write.repository';
import { KeycloakIdentityProviderAdapter } from '@contexts/identity/infrastructure/adapters/keycloak-identity-provider.adapter';
import { TenantMembershipLookupAdapter } from '@contexts/identity/infrastructure/adapters/tenant-membership-lookup.adapter';
import { UserEntity } from '@contexts/identity/infrastructure/persistence/typeorm/entities/user.entity';
import { UserTypeOrmMapper } from '@contexts/identity/infrastructure/persistence/typeorm/mappers/user-typeorm.mapper';
import { UserTypeOrmReadRepository } from '@contexts/identity/infrastructure/persistence/typeorm/repositories/user-typeorm-read.repository';
import { UserTypeOrmWriteRepository } from '@contexts/identity/infrastructure/persistence/typeorm/repositories/user-typeorm-write.repository';
import { AuthController } from '@contexts/identity/transport/rest/controllers/auth.controller';
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';

const COMMAND_HANDLERS = [
  RegisterUserCommandHandler,
  LoginUserCommandHandler,
  RefreshSessionCommandHandler,
];

const QUERY_HANDLERS = [UserFindByEmailQueryHandler];

const APPLICATION_SERVICES = [
  TokenService,
  AssertUserEmailAvailableService,
  GenerateRefreshTokenService,
  HashRefreshTokenService,
];

const DOMAIN_BUILDERS = [UserBuilder];

const INFRASTRUCTURE_MAPPERS = [UserTypeOrmMapper];

const INFRASTRUCTURE_REPOSITORIES = [
  { provide: USER_WRITE_REPOSITORY, useClass: UserTypeOrmWriteRepository },
  { provide: USER_READ_REPOSITORY, useClass: UserTypeOrmReadRepository },
];

const INFRASTRUCTURE_ENTITIES = [UserEntity];

const INFRASTRUCTURE_ADAPTERS = [
  {
    provide: IDENTITY_PROVIDER_PORT,
    useClass: KeycloakIdentityProviderAdapter,
  },
  {
    provide: TENANT_MEMBERSHIP_LOOKUP_PORT,
    useClass: TenantMembershipLookupAdapter,
  },
];

const TRANSPORT_REST_CONTROLLERS = [AuthController];

@Module({
  imports: [
    CqrsModule,
    TypeOrmModule.forFeature(INFRASTRUCTURE_ENTITIES),
    // JwtService itself comes from the global `SecurityModule` (imported
    // once in CoreModule) — TokenService just injects it, no per-context
    // JwtModule.registerAsync here (that would risk a second, divergent
    // config from the one `JwtAuthGuard` verifies against).
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
  ],
  exports: [TokenService],
})
export class IdentityModule {}
