import { AddTenantMemberCommand } from '@contexts/tenancy/application/commands/add-tenant-member/add-tenant-member.command';
import { IAddTenantMemberResult } from '@contexts/tenancy/application/commands/add-tenant-member/add-tenant-member-result.interface';
import { CreateTenantCommand } from '@contexts/tenancy/application/commands/create-tenant/create-tenant.command';
import { ICreateTenantResult } from '@contexts/tenancy/application/commands/create-tenant/create-tenant-result.interface';
import { TenantMembershipFindByTenantIdQuery } from '@contexts/tenancy/application/queries/tenant-membership-find-by-tenant-id/tenant-membership-find-by-tenant-id.query';
import { TenantMembershipViewModel } from '@contexts/tenancy/domain/view-models/tenant-membership.view-model';
import { AddTenantMemberDto } from '@contexts/tenancy/transport/rest/dtos/add-tenant-member.dto';
import { CreateTenantDto } from '@contexts/tenancy/transport/rest/dtos/create-tenant.dto';
import { TenantMembershipRestResponseDto } from '@contexts/tenancy/transport/rest/dtos/tenant-membership-rest-response.dto';
import { TenantMembershipRestMapper } from '@contexts/tenancy/transport/rest/mappers/tenant-membership/tenant-membership.mapper';
import {
  CurrentUser,
  CurrentUserPayload,
} from '@core/security/decorators/current-user.decorator';
import { JwtAuthGuard } from '@core/security/guards/jwt-auth.guard';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  ParseUUIDPipe,
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
@Controller('tenants')
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
