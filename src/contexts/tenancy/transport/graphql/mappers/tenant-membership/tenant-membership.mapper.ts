import { TenantRoleEnum } from '@contexts/tenancy/domain/enums/tenant-role.enum';
import { TenantMembershipViewModel } from '@contexts/tenancy/domain/view-models/tenant-membership.view-model';
import { TenantMembershipResponseDto } from '@contexts/tenancy/transport/graphql/dtos/responses/tenant-membership/tenant-membership.response.dto';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class TenantMembershipGraphQLMapper {
  private readonly logger = new Logger(TenantMembershipGraphQLMapper.name);

  toResponseDtoFromViewModel(
    vm: TenantMembershipViewModel,
  ): TenantMembershipResponseDto {
    this.logger.log(
      `Mapping tenant membership view model to response dto: ${vm.id}`,
    );

    return {
      id: vm.id,
      tenantId: vm.tenantId,
      userId: vm.userId,
      role: vm.role as TenantRoleEnum,
      createdAt: vm.createdAt,
      updatedAt: vm.updatedAt,
    };
  }
}
