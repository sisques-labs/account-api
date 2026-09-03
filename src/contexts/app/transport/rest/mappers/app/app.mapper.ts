import { AppViewModel } from '@contexts/app/domain/view-models/app.view-model';
import { AppRestResponseDto } from '@contexts/app/transport/rest/dtos/app-rest-response.dto';
import { Injectable } from '@nestjs/common';

/**
 * Maps the domain ViewModel (a class instance — `BaseViewModel` backs its
 * public fields with `_id`/`_createdAt`/`_updatedAt`) to a plain response
 * object. Returning the ViewModel directly from a controller would leak
 * those underscore-prefixed instance fields through `res.json()`.
 */
@Injectable()
export class AppRestMapper {
  toResponseDto(viewModel: AppViewModel): AppRestResponseDto {
    return {
      id: viewModel.id,
      slug: viewModel.slug,
      name: viewModel.name,
      createdAt: viewModel.createdAt,
      updatedAt: viewModel.updatedAt,
    };
  }
}
