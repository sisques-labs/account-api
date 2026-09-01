import { AppFindByCriteriaQuery } from '@contexts/app/application/queries/app-find-by-criteria/app-find-by-criteria.query';
import { AppFindByIdQuery } from '@contexts/app/application/queries/app-find-by-id/app-find-by-id.query';
import { appFilterableFields } from '@contexts/app/transport/graphql/registries/app-filterable-fields.registry';
import { AppFindByIdRequestDto } from '@contexts/app/transport/graphql/dtos/requests/app/app-find-by-id.request.dto';
import { AppFindByCriteriaRequestDto } from '@contexts/app/transport/graphql/dtos/requests/app/app-find-by-criteria.request.dto';
import {
  AppResponseDto,
  PaginatedAppResultDto,
} from '@contexts/app/transport/graphql/dtos/responses/app/app.response.dto';
import { AppGraphQLMapper } from '@contexts/app/transport/graphql/mappers/app/app.mapper';
import { Logger } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { Criteria } from '@sisques-labs/nestjs-kit';
import { FilterValidationPipe } from '@sisques-labs/nestjs-kit/graphql';

@Resolver(() => AppResponseDto)
export class AppQueriesResolver {
  private readonly logger = new Logger(AppQueriesResolver.name);

  constructor(
    private readonly queryBus: QueryBus,
    private readonly appGraphQLMapper: AppGraphQLMapper,
  ) {}

  @Query(() => AppResponseDto, { nullable: true })
  async appFindById(
    @Args('input') input: AppFindByIdRequestDto,
  ): Promise<AppResponseDto | null> {
    this.logger.log(`Finding app by id: ${input.id}`);

    const result = await this.queryBus.execute(
      new AppFindByIdQuery({ id: input.id }),
    );

    return result
      ? this.appGraphQLMapper.toResponseDtoFromViewModel(result)
      : null;
  }

  @Query(() => PaginatedAppResultDto)
  async appsFindByCriteria(
    @Args(
      'input',
      { nullable: true },
      new FilterValidationPipe(appFilterableFields),
    )
    input?: AppFindByCriteriaRequestDto,
  ): Promise<PaginatedAppResultDto> {
    this.logger.log(`Finding apps by criteria: ${JSON.stringify(input)}`);

    const criteria = new Criteria(
      input?.filters,
      input?.sorts,
      input?.pagination,
    );

    const result = await this.queryBus.execute(
      new AppFindByCriteriaQuery({ criteria }),
    );

    return this.appGraphQLMapper.toPaginatedResponseDto(result);
  }
}
