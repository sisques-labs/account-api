import { AddTenantMemberCommand } from '@contexts/tenancy/application/commands/add-tenant-member/add-tenant-member.command';
import { IAddTenantMemberResult } from '@contexts/tenancy/application/commands/add-tenant-member/add-tenant-member.handler';
import { CreateTenantCommand } from '@contexts/tenancy/application/commands/create-tenant/create-tenant.command';
import { DeleteTenantCommand } from '@contexts/tenancy/application/commands/delete-tenant/delete-tenant.command';
import { UpdateTenantCommand } from '@contexts/tenancy/application/commands/update-tenant/update-tenant.command';
import { TenantFindByCriteriaQuery } from '@contexts/tenancy/application/queries/tenant-find-by-criteria/tenant-find-by-criteria.query';
import { TenantMembershipFindByTenantIdQuery } from '@contexts/tenancy/application/queries/tenant-membership-find-by-tenant-id/tenant-membership-find-by-tenant-id.query';
import { TenantMembershipViewModel } from '@contexts/tenancy/domain/view-models/tenant-membership.view-model';
import { TenantViewModel } from '@contexts/tenancy/domain/view-models/tenant.view-model';
import { AddTenantMemberDto } from '@contexts/tenancy/transport/rest/dtos/add-tenant-member.dto';
import { CreateTenantDto } from '@contexts/tenancy/transport/rest/dtos/create-tenant.dto';
import { TenantCriteriaDto } from '@contexts/tenancy/transport/rest/dtos/tenant-criteria.dto';
import { TenantMembershipRestResponseDto } from '@contexts/tenancy/transport/rest/dtos/tenant-membership-rest-response.dto';
import { TenantRestResponseDto } from '@contexts/tenancy/transport/rest/dtos/tenant-rest-response.dto';
import { UpdateTenantDto } from '@contexts/tenancy/transport/rest/dtos/update-tenant.dto';
import { TenantMembershipRestMapper } from '@contexts/tenancy/transport/rest/mappers/tenant-membership/tenant-membership.mapper';
import { TenantRestMapper } from '@contexts/tenancy/transport/rest/mappers/tenant/tenant.mapper';
import { TenantPermissionEnum } from '@contexts/tenancy/domain/enums/tenant-permission.enum';
import { RequiresPermission } from '@contexts/tenancy/infrastructure/decorators/requires-permission.decorator';
import { TenantPermissionGuard } from '@contexts/tenancy/infrastructure/guards/tenant-permission.guard';
import {
  CurrentUser,
  CurrentUserPayload,
} from '@core/security/decorators/current-user.decorator';
import { JwtAuthGuard } from '@core/security/guards/jwt-auth.guard';
import { PlatformAdminGuard } from '@core/security/guards/platform-admin.guard';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  Criteria,
  Filter,
  FilterOperator,
  PaginatedResult,
} from '@sisques-labs/nestjs-kit';

@ApiTags('tenants')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'tenants', version: '1' })
export class TenantsController {
  private readonly logger = new Logger(TenantsController.name);

  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly tenantMembershipRestMapper: TenantMembershipRestMapper,
    private readonly tenantRestMapper: TenantRestMapper,
  ) {}

  @Get()
  @UseGuards(PlatformAdminGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List all tenants — platform admin only' })
  @ApiResponse({ status: 200, description: 'Paginated tenants list' })
  @ApiResponse({ status: 403, description: 'Caller is not a platform admin' })
  async findByCriteria(
    @Query() query: TenantCriteriaDto,
  ): Promise<PaginatedResult<TenantRestResponseDto>> {
    this.logger.log(`GET /tenants ${JSON.stringify(query)}`);

    const filters: Filter[] = [];
    if (query.id) {
      filters.push({
        field: 'id',
        operator: FilterOperator.EQUALS,
        value: query.id,
      });
    }
    if (query.appId) {
      filters.push({
        field: 'appId',
        operator: FilterOperator.EQUALS,
        value: query.appId,
      });
    }
    if (query.slug) {
      filters.push({
        field: 'slug',
        operator: FilterOperator.LIKE,
        value: query.slug,
      });
    }
    if (query.name) {
      filters.push({
        field: 'name',
        operator: FilterOperator.LIKE,
        value: query.name,
      });
    }

    const pagination =
      query.page || query.limit
        ? { page: query.page ?? 1, perPage: query.limit ?? 20 }
        : undefined;

    const criteria = new Criteria(filters, undefined, pagination);
    const result = await this.queryBus.execute<
      TenantFindByCriteriaQuery,
      PaginatedResult<TenantViewModel>
    >(new TenantFindByCriteriaQuery({ criteria }));

    const items = result.items.map((tenant) =>
      this.tenantRestMapper.toResponseDto(tenant),
    );

    return new PaginatedResult(
      items,
      result.total,
      result.page,
      result.perPage,
    );
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a tenant — the caller is automatically added as owner',
  })
  @ApiResponse({ status: 201, description: 'Tenant created' })
  @ApiResponse({ status: 404, description: 'App not found' })
  @ApiResponse({ status: 409, description: 'Slug already taken for this app' })
  async create(
    @Body() dto: CreateTenantDto,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<string> {
    this.logger.log(`POST /tenants appId=${dto.appId} creator=${user.userId}`);
    return this.commandBus.execute(
      new CreateTenantCommand({
        appId: dto.appId,
        name: dto.name,
        slug: dto.slug,
        creatorUserId: user.userId,
      }),
    );
  }

  @Patch(':tenantId')
  @UseGuards(TenantPermissionGuard)
  @RequiresPermission(TenantPermissionEnum.MANAGE_TENANT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update a tenant — requires manage-tenant permission',
  })
  @ApiResponse({ status: 200, description: 'Tenant updated' })
  @ApiResponse({
    status: 403,
    description:
      'Caller has no membership in the tenant, or their role does not grant manage-tenant',
  })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  @ApiResponse({ status: 409, description: 'Slug already taken for this app' })
  async update(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Body() dto: UpdateTenantDto,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<string> {
    this.logger.log(`PATCH /tenants/${tenantId} requester=${user.userId}`);
    return this.commandBus.execute(
      new UpdateTenantCommand({
        tenantId,
        requesterUserId: user.userId,
        name: dto.name,
        slug: dto.slug,
      }),
    );
  }

  @Delete(':tenantId')
  @UseGuards(TenantPermissionGuard)
  @RequiresPermission(TenantPermissionEnum.DELETE_TENANT)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a tenant — requires delete-tenant permission',
  })
  @ApiResponse({ status: 204, description: 'Tenant deleted' })
  @ApiResponse({
    status: 403,
    description:
      'Caller has no membership in the tenant, or their role does not grant delete-tenant',
  })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  async remove(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<void> {
    this.logger.log(`DELETE /tenants/${tenantId} requester=${user.userId}`);
    await this.commandBus.execute(
      new DeleteTenantCommand({ tenantId, requesterUserId: user.userId }),
    );
  }

  @Post(':tenantId/members')
  @UseGuards(TenantPermissionGuard)
  @RequiresPermission(TenantPermissionEnum.MANAGE_MEMBERS)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      'Add an existing user as a member of the tenant (by email) — requires manage-members permission',
  })
  @ApiResponse({ status: 201, description: 'Member added' })
  @ApiResponse({
    status: 403,
    description:
      'Caller has no membership in the tenant, or their role does not grant manage-members',
  })
  @ApiResponse({ status: 404, description: 'Tenant or user not found' })
  @ApiResponse({ status: 409, description: 'User is already a member' })
  async addMember(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Body() dto: AddTenantMemberDto,
  ): Promise<IAddTenantMemberResult> {
    this.logger.log(`POST /tenants/${tenantId}/members email=${dto.email}`);
    return this.commandBus.execute(
      new AddTenantMemberCommand({
        tenantId,
        email: dto.email,
        role: dto.role,
      }),
    );
  }

  @Get(':tenantId/members')
  @UseGuards(TenantPermissionGuard)
  @RequiresPermission(TenantPermissionEnum.VIEW_TENANT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "List a tenant's members — requires view-tenant permission",
  })
  @ApiResponse({ status: 200, description: 'Members list' })
  @ApiResponse({
    status: 403,
    description: 'Caller has no membership in the tenant',
  })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  async listMembers(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
  ): Promise<TenantMembershipRestResponseDto[]> {
    this.logger.log(`GET /tenants/${tenantId}/members`);
    const members = await this.queryBus.execute<
      TenantMembershipFindByTenantIdQuery,
      TenantMembershipViewModel[]
    >(new TenantMembershipFindByTenantIdQuery({ tenantId }));
    return members.map((member) =>
      this.tenantMembershipRestMapper.toResponseDto(member),
    );
  }
}
