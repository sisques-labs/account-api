import { AddTenantMemberCommand } from '@contexts/tenancy/application/commands/add-tenant-member/add-tenant-member.command';
import { IAddTenantMemberResult } from '@contexts/tenancy/application/commands/add-tenant-member/add-tenant-member.handler';
import { CreateTenantCommand } from '@contexts/tenancy/application/commands/create-tenant/create-tenant.command';
import { ICreateTenantResult } from '@contexts/tenancy/application/commands/create-tenant/create-tenant-result.interface';
import { DeleteTenantCommand } from '@contexts/tenancy/application/commands/delete-tenant/delete-tenant.command';
import { UpdateTenantCommand } from '@contexts/tenancy/application/commands/update-tenant/update-tenant.command';
import { TenantMembershipFindByTenantIdQuery } from '@contexts/tenancy/application/queries/tenant-membership-find-by-tenant-id/tenant-membership-find-by-tenant-id.query';
import { TenantMembershipViewModel } from '@contexts/tenancy/domain/view-models/tenant-membership.view-model';
import { AddTenantMemberDto } from '@contexts/tenancy/transport/rest/dtos/add-tenant-member.dto';
import { CreateTenantDto } from '@contexts/tenancy/transport/rest/dtos/create-tenant.dto';
import { TenantMembershipRestResponseDto } from '@contexts/tenancy/transport/rest/dtos/tenant-membership-rest-response.dto';
import { UpdateTenantDto } from '@contexts/tenancy/transport/rest/dtos/update-tenant.dto';
import { TenantMembershipRestMapper } from '@contexts/tenancy/transport/rest/mappers/tenant-membership/tenant-membership.mapper';
import {
  CurrentUser,
  CurrentUserPayload,
} from '@core/security/decorators/current-user.decorator';
import { JwtAuthGuard } from '@core/security/guards/jwt-auth.guard';
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
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

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
  ) {}

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
  ): Promise<ICreateTenantResult> {
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
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a tenant — owner only' })
  @ApiResponse({ status: 200, description: 'Tenant updated' })
  @ApiResponse({
    status: 403,
    description: 'Caller is not an owner of the tenant',
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
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a tenant — owner only' })
  @ApiResponse({ status: 204, description: 'Tenant deleted' })
  @ApiResponse({
    status: 403,
    description: 'Caller is not an owner of the tenant',
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
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Add an existing user as a member of the tenant (by email)',
  })
  @ApiResponse({ status: 201, description: 'Member added' })
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
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "List a tenant's members" })
  @ApiResponse({ status: 200, description: 'Members list' })
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
