import { TenantViewModel } from '@contexts/tenancy/domain/view-models/tenant.view-model';
import {
  PaginatedTenantResultDto,
  TenantResponseDto,
} from '@contexts/tenancy/transport/graphql/dtos/responses/tenant/tenant.response.dto';
import { Injectable, Logger } from '@nestjs/common';
import { PaginatedResult } from '@sisques-labs/nestjs-kit';

@Injectable()
export class TenantGraphQLMapper {
  private readonly logger = new Logger(TenantGraphQLMapper.name);

  toResponseDtoFromViewModel(vm: TenantViewModel): TenantResponseDto {
    this.logger.log(`Mapping tenant view model to response dto: ${vm.id}`);

    return {
      id: vm.id,
      appId: vm.appId,
      name: vm.name,
      slug: vm.slug,
      createdAt: vm.createdAt,
      updatedAt: vm.updatedAt,
    };
  }

  toPaginatedResponseDto(
    paginatedResult: PaginatedResult<TenantViewModel>,
  ): PaginatedTenantResultDto {
    return {
      items: paginatedResult.items.map((vm) =>
        this.toResponseDtoFromViewModel(vm),
      ),
      total: paginatedResult.total,
      page: paginatedResult.page,
      perPage: paginatedResult.perPage,
      totalPages: paginatedResult.totalPages,
    };
  }
}
