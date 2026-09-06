import { AddTenantMemberCommand } from '@contexts/tenancy/application/commands/add-tenant-member/add-tenant-member.command';
import { CreateTenantCommand } from '@contexts/tenancy/application/commands/create-tenant/create-tenant.command';
import { DeleteTenantCommand } from '@contexts/tenancy/application/commands/delete-tenant/delete-tenant.command';
import { UpdateTenantCommand } from '@contexts/tenancy/application/commands/update-tenant/update-tenant.command';
import { TenantAddMemberRequestDto } from '@contexts/tenancy/transport/graphql/dtos/requests/tenant/tenant-add-member.request.dto';
import { TenantCreateRequestDto } from '@contexts/tenancy/transport/graphql/dtos/requests/tenant/tenant-create.request.dto';
import { TenantDeleteRequestDto } from '@contexts/tenancy/transport/graphql/dtos/requests/tenant/tenant-delete.request.dto';
import { TenantUpdateRequestDto } from '@contexts/tenancy/transport/graphql/dtos/requests/tenant/tenant-update.request.dto';
import { TenantPermissionEnum } from '@contexts/tenancy/domain/enums/tenant-permission.enum';
import { RequiresPermission } from '@contexts/tenancy/infrastructure/decorators/requires-permission.decorator';
import { TenantPermissionGuard } from '@contexts/tenancy/infrastructure/guards/tenant-permission.guard';
import {
  CurrentUser,
  CurrentUserPayload,
} from '@core/security/decorators/current-user.decorator';
import { JwtAuthGuard } from '@core/security/guards/jwt-auth.guard';
import { Logger, UseGuards } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import {
  MutationResponseDto,
  MutationResponseGraphQLMapper,
} from '@sisques-labs/nestjs-kit/graphql';

@Resolver()
@UseGuards(JwtAuthGuard)
export class TenantMutationsResolver {
  private readonly logger = new Logger(TenantMutationsResolver.name);

  constructor(
    private readonly commandBus: CommandBus,
    private readonly mutationResponseGraphQLMapper: MutationResponseGraphQLMapper,
  ) {}

  @Mutation(() => MutationResponseDto)
  async tenantCreate(
    @Args('input') input: TenantCreateRequestDto,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<MutationResponseDto> {
    this.logger.log(
      `Creating tenant appId=${input.appId} creator=${user.userId}`,
    );

    const tenantId = await this.commandBus.execute<CreateTenantCommand, string>(
      new CreateTenantCommand({
        appId: input.appId,
        name: input.name,
        slug: input.slug,
        creatorUserId: user.userId,
      }),
    );

    return this.mutationResponseGraphQLMapper.toResponseDto({
      success: true,
      message: 'Tenant created successfully',
      id: tenantId,
    });
  }

  @Mutation(() => MutationResponseDto)
  @UseGuards(TenantPermissionGuard)
  @RequiresPermission(TenantPermissionEnum.MANAGE_TENANT)
  async tenantUpdate(
    @Args('input') input: TenantUpdateRequestDto,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<MutationResponseDto> {
    this.logger.log(
      `Updating tenant ${input.tenantId} requester=${user.userId}`,
    );

    await this.commandBus.execute(
      new UpdateTenantCommand({
        tenantId: input.tenantId,
        requesterUserId: user.userId,
        name: input.name,
        slug: input.slug,
      }),
    );

    return this.mutationResponseGraphQLMapper.toResponseDto({
      success: true,
      message: 'Tenant updated successfully',
      id: input.tenantId,
    });
  }

  @Mutation(() => MutationResponseDto)
  @UseGuards(TenantPermissionGuard)
  @RequiresPermission(TenantPermissionEnum.DELETE_TENANT)
  async tenantDelete(
    @Args('input') input: TenantDeleteRequestDto,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<MutationResponseDto> {
    this.logger.log(
      `Deleting tenant ${input.tenantId} requester=${user.userId}`,
    );

    await this.commandBus.execute(
      new DeleteTenantCommand({
        tenantId: input.tenantId,
        requesterUserId: user.userId,
      }),
    );

    return this.mutationResponseGraphQLMapper.toResponseDto({
      success: true,
      message: 'Tenant deleted successfully',
      id: input.tenantId,
    });
  }

  @Mutation(() => MutationResponseDto)
  @UseGuards(TenantPermissionGuard)
  @RequiresPermission(TenantPermissionEnum.MANAGE_MEMBERS)
  async tenantMemberAdd(
    @Args('input') input: TenantAddMemberRequestDto,
  ): Promise<MutationResponseDto> {
    this.logger.log(`Adding member ${input.email} to tenant ${input.tenantId}`);

    const result = await this.commandBus.execute(
      new AddTenantMemberCommand({
        tenantId: input.tenantId,
        email: input.email,
        role: input.role,
      }),
    );

    return this.mutationResponseGraphQLMapper.toResponseDto({
      success: true,
      message: 'Member added successfully',
      id: result.membershipId,
    });
  }
}
