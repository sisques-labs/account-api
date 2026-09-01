import { AppViewModel } from '@contexts/app/domain/view-models/app.view-model';
import {
  AppResponseDto,
  PaginatedAppResultDto,
} from '@contexts/app/transport/graphql/dtos/responses/app.response.dto';
import { Injectable, Logger } from '@nestjs/common';
import { PaginatedResult } from '@sisques-labs/nestjs-kit';

@Injectable()
export class AppGraphQLMapper {
  private readonly logger = new Logger(AppGraphQLMapper.name);

  toResponseDtoFromViewModel(vm: AppViewModel): AppResponseDto {
    this.logger.log(`Mapping app view model to response dto: ${vm.id}`);

    return {
      id: vm.id,
      slug: vm.slug,
      name: vm.name,
      createdAt: vm.createdAt,
      updatedAt: vm.updatedAt,
    };
  }

  toPaginatedResponseDto(
    paginatedResult: PaginatedResult<AppViewModel>,
  ): PaginatedAppResultDto {
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
