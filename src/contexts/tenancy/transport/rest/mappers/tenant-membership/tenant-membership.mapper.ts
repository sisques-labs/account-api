import { TenantMembershipViewModel } from '@contexts/tenancy/domain/view-models/tenant-membership.view-model';
import { TenantMembershipRestResponseDto } from '@contexts/tenancy/transport/rest/dtos/tenant-membership-rest-response.dto';
import { Injectable } from '@nestjs/common';

/** See `AppRestMapper` for why ViewModels aren't returned from controllers directly. */
@Injectable()
export class TenantMembershipRestMapper {
  toResponseDto(
    viewModel: TenantMembershipViewModel,
  ): TenantMembershipRestResponseDto {
    return {
      id: viewModel.id,
      tenantId: viewModel.tenantId,
      userId: viewModel.userId,
      role: viewModel.role,
      createdAt: viewModel.createdAt,
      updatedAt: viewModel.updatedAt,
    };
  }
}
