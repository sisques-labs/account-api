import { LoginUserCommandHandler } from '@contexts/auth/application/commands/login-user/login-user.handler';
import { RefreshSessionCommandHandler } from '@contexts/auth/application/commands/refresh-session/refresh-session.handler';
import { RegisterUserCommandHandler } from '@contexts/auth/application/commands/register-user/register-user.handler';
import { IDENTITY_PROVIDER_PORT } from '@contexts/auth/application/ports/identity-provider.port';
import { TENANT_MEMBERSHIP_LOOKUP_PORT } from '@contexts/auth/application/ports/tenant-membership-lookup.port';
import { USER_LOOKUP_PORT } from '@contexts/auth/application/ports/user-lookup.port';
import { USER_PROVISIONING_PORT } from '@contexts/auth/application/ports/user-provisioning.port';
import { GenerateRefreshTokenService } from '@contexts/auth/application/services/write/generate-refresh-token/generate-refresh-token.service';
import { HashRefreshTokenService } from '@contexts/auth/application/services/write/hash-refresh-token/hash-refresh-token.service';
import { TokenSignService } from '@contexts/auth/application/services/write/token-sign/token-sign.service';
import { TokenVerifyService } from '@contexts/auth/application/services/write/token-verify/token-verify.service';
import { SessionBuilder } from '@contexts/auth/domain/builders/session.builder';
import { SESSION_WRITE_REPOSITORY } from '@contexts/auth/domain/repositories/write/session-write.repository';
import { KeycloakIdentityProviderAdapter } from '@contexts/auth/infrastructure/adapters/keycloak-identity-provider.adapter';
import { TenantMembershipLookupAdapter } from '@contexts/auth/infrastructure/adapters/tenant-membership-lookup.adapter';
import { UserLookupAdapter } from '@contexts/auth/infrastructure/adapters/user-lookup.adapter';
import { UserProvisioningAdapter } from '@contexts/auth/infrastructure/adapters/user-provisioning.adapter';
import { SessionEntity } from '@contexts/auth/infrastructure/persistence/typeorm/entities/session.entity';
import { SessionTypeOrmMapper } from '@contexts/auth/infrastructure/persistence/typeorm/mappers/session-typeorm.mapper';
import { SessionTypeOrmWriteRepository } from '@contexts/auth/infrastructure/persistence/typeorm/repositories/session-typeorm-write.repository';
import { AuthController } from '@contexts/auth/transport/rest/controllers/auth.controller';
import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';

const COMMAND_HANDLERS = [
  RegisterUserCommandHandler,
  LoginUserCommandHandler,
  RefreshSessionCommandHandler,
];

const APPLICATION_SERVICES = [
  TokenSignService,
  TokenVerifyService,
  GenerateRefreshTokenService,
  HashRefreshTokenService,
];

const DOMAIN_BUILDERS = [SessionBuilder];

const INFRASTRUCTURE_MAPPERS = [SessionTypeOrmMapper];

const INFRASTRUCTURE_REPOSITORIES = [
  {
    provide: SESSION_WRITE_REPOSITORY,
    useClass: SessionTypeOrmWriteRepository,
  },
];

const INFRASTRUCTURE_ENTITIES = [SessionEntity];

const INFRASTRUCTURE_ADAPTERS = [
  {
    provide: IDENTITY_PROVIDER_PORT,
    useClass: KeycloakIdentityProviderAdapter,
  },
  {
    provide: TENANT_MEMBERSHIP_LOOKUP_PORT,
    useClass: TenantMembershipLookupAdapter,
  },
  { provide: USER_LOOKUP_PORT, useClass: UserLookupAdapter },
  { provide: USER_PROVISIONING_PORT, useClass: UserProvisioningAdapter },
];

const TRANSPORT_REST_CONTROLLERS = [AuthController];

@Module({
  imports: [
    CqrsModule,
    HttpModule,
    TypeOrmModule.forFeature(INFRASTRUCTURE_ENTITIES),
    // JwtService itself comes from the global `SecurityModule` (imported
    // once in CoreModule) — TokenSignService/TokenVerifyService just inject
    // it, no per-context JwtModule.registerAsync here (that would risk a
    // second, divergent config from the one `JwtAuthGuard` verifies
    // against).
  ],
  controllers: [...TRANSPORT_REST_CONTROLLERS],
  providers: [
    ...COMMAND_HANDLERS,
    ...APPLICATION_SERVICES,
    ...DOMAIN_BUILDERS,
    ...INFRASTRUCTURE_MAPPERS,
    ...INFRASTRUCTURE_REPOSITORIES,
    ...INFRASTRUCTURE_ADAPTERS,
  ],
  exports: [TokenSignService, TokenVerifyService],
})
export class AuthModule {}
