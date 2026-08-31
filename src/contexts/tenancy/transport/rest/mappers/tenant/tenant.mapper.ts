import { TenantViewModel } from '@contexts/tenancy/domain/view-models/tenant.view-model';
import { TenantRestResponseDto } from '@contexts/tenancy/transport/rest/dtos/tenant-rest-response.dto';
import { Injectable } from '@nestjs/common';

/** See `AppRestMapper` for why ViewModels aren't returned from controllers directly. */
@Injectable()
export class TenantRestMapper {
  toResponseDto(viewModel: TenantViewModel): TenantRestResponseDto {
    return {
      id: viewModel.id,
      appId: viewModel.appId,
      name: viewModel.name,
      slug: viewModel.slug,
      createdAt: viewModel.createdAt,
      updatedAt: viewModel.updatedAt,
    };
  }
}
