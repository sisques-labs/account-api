import { TenantFindByCriteriaQuery } from '@contexts/tenancy/application/queries/tenant-find-by-criteria/tenant-find-by-criteria.query';
import { TenantMembershipFindByTenantIdQuery } from '@contexts/tenancy/application/queries/tenant-membership-find-by-tenant-id/tenant-membership-find-by-tenant-id.query';
import { TenantMembershipViewModel } from '@contexts/tenancy/domain/view-models/tenant-membership.view-model';
import { TenantFindByCriteriaRequestDto } from '@contexts/tenancy/transport/graphql/dtos/requests/tenant/tenant-find-by-criteria.request.dto';
import { TenantMembershipFindByTenantIdRequestDto } from '@contexts/tenancy/transport/graphql/dtos/requests/tenant-membership/tenant-membership-find-by-tenant-id.request.dto';
import {
  PaginatedTenantResultDto,
  TenantResponseDto,
} from '@contexts/tenancy/transport/graphql/dtos/responses/tenant/tenant.response.dto';
import { TenantMembershipResponseDto } from '@contexts/tenancy/transport/graphql/dtos/responses/tenant-membership/tenant-membership.response.dto';
import { TenantMembershipGraphQLMapper } from '@contexts/tenancy/transport/graphql/mappers/tenant-membership/tenant-membership.mapper';
import { TenantGraphQLMapper } from '@contexts/tenancy/transport/graphql/mappers/tenant/tenant.mapper';
import { tenantFilterableFields } from '@contexts/tenancy/transport/graphql/registries/tenant-filterable-fields.registry';
import { TenantPermissionEnum } from '@contexts/tenancy/domain/enums/tenant-permission.enum';
import { RequiresPermission } from '@contexts/tenancy/infrastructure/decorators/requires-permission.decorator';
import { TenantPermissionGuard } from '@contexts/tenancy/infrastructure/guards/tenant-permission.guard';
import { JwtAuthGuard } from '@core/security/guards/jwt-auth.guard';
import { PlatformAdminGuard } from '@core/security/guards/platform-admin.guard';
import { Logger, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { Criteria } from '@sisques-labs/nestjs-kit';
import { FilterValidationPipe } from '@sisques-labs/nestjs-kit/graphql';

@Resolver(() => TenantResponseDto)
@UseGuards(JwtAuthGuard)
export class TenantQueriesResolver {
  private readonly logger = new Logger(TenantQueriesResolver.name);

  constructor(
    private readonly queryBus: QueryBus,
    private readonly tenantGraphQLMapper: TenantGraphQLMapper,
    private readonly tenantMembershipGraphQLMapper: TenantMembershipGraphQLMapper,
  ) {}

  @Query(() => PaginatedTenantResultDto)
  @UseGuards(PlatformAdminGuard)
  async tenantsFindByCriteria(
    @Args(
      'input',
      { nullable: true },
      new FilterValidationPipe(tenantFilterableFields),
    )
    input?: TenantFindByCriteriaRequestDto,
  ): Promise<PaginatedTenantResultDto> {
    this.logger.log(`Finding tenants by criteria: ${JSON.stringify(input)}`);

    const criteria = new Criteria(
      input?.filters,
      input?.sorts,
      input?.pagination,
    );

    const result = await this.queryBus.execute(
      new TenantFindByCriteriaQuery({ criteria }),
    );

    return this.tenantGraphQLMapper.toPaginatedResponseDto(result);
  }

  @Query(() => [TenantMembershipResponseDto])
  @UseGuards(TenantPermissionGuard)
  @RequiresPermission(TenantPermissionEnum.VIEW_TENANT)
  async tenantMembershipsFindByTenantId(
    @Args('input') input: TenantMembershipFindByTenantIdRequestDto,
  ): Promise<TenantMembershipResponseDto[]> {
    this.logger.log(`Finding members of tenant: ${input.tenantId}`);

    const members = await this.queryBus.execute<
      TenantMembershipFindByTenantIdQuery,
      TenantMembershipViewModel[]
    >(new TenantMembershipFindByTenantIdQuery({ tenantId: input.tenantId }));

    return members.map((member) =>
      this.tenantMembershipGraphQLMapper.toResponseDtoFromViewModel(member),
    );
  }
}
