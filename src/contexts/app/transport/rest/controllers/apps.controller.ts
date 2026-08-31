import { CreateAppCommand } from '@contexts/app/application/commands/create-app/create-app.command';
import { AppFindByCriteriaQuery } from '@contexts/app/application/queries/app-find-by-criteria/app-find-by-criteria.query';
import { AppViewModel } from '@contexts/app/domain/view-models/app.view-model';
import { AppRestResponseDto } from '@contexts/app/transport/rest/dtos/app-rest-response.dto';
import { AppCriteriaDto } from '@contexts/app/transport/rest/dtos/app-criteria.dto';
import { CreateAppDto } from '@contexts/app/transport/rest/dtos/create-app.dto';
import { AppRestMapper } from '@contexts/app/transport/rest/mappers/app/app.mapper';
import { JwtAuthGuard } from '@core/security/guards/jwt-auth.guard';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  Criteria,
  Filter,
  FilterOperator,
  PaginatedResult,
} from '@sisques-labs/nestjs-kit';

/**
 * Minimal app registry plumbing — not called out as an MVP endpoint in the
 * architecture doc, but `tenant.app_id` is a required FK and nothing else
 * creates an `app` row, so this is the smallest surface that makes
 * `POST /api/v1/tenants` testable at all.
 */
@ApiTags('apps')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'apps', version: '1' })
export class AppsController {
  private readonly logger = new Logger(AppsController.name);

  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly appRestMapper: AppRestMapper,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new app (e.g. "gardenia", "nexora")' })
  @ApiResponse({ status: 201, description: 'App created' })
  @ApiResponse({ status: 409, description: 'Slug already taken' })
  async create(@Body() dto: CreateAppDto): Promise<string> {
    this.logger.log(`POST /apps slug=${dto.slug}`);
    return this.commandBus.execute(
      new CreateAppCommand({ slug: dto.slug, name: dto.name }),
    );
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List registered apps' })
  @ApiResponse({ status: 200, description: 'Paginated apps list' })
  async findByCriteria(
    @Query() query: AppCriteriaDto,
  ): Promise<PaginatedResult<AppRestResponseDto>> {
    this.logger.log(`GET /apps ${JSON.stringify(query)}`);

    const filters: Filter[] = [];
    if (query.id) {
      filters.push({
        field: 'id',
        operator: FilterOperator.EQUALS,
        value: query.id,
      });
    }
    if (query.slug) {
      filters.push({
        field: 'slug',
        operator: FilterOperator.LIKE,
        value: query.slug,
      });
    }
    if (query.name) {
      filters.push({
        field: 'name',
        operator: FilterOperator.LIKE,
        value: query.name,
      });
    }

    const pagination =
      query.page || query.limit
        ? { page: query.page ?? 1, perPage: query.limit ?? 20 }
        : undefined;

    const criteria = new Criteria(filters, undefined, pagination);
    const result = await this.queryBus.execute<
      AppFindByCriteriaQuery,
      PaginatedResult<AppViewModel>
    >(new AppFindByCriteriaQuery({ criteria }));

    const items = result.items.map((app) =>
      this.appRestMapper.toResponseDto(app),
    );

    return new PaginatedResult(
      items,
      result.total,
      result.page,
      result.perPage,
    );
  }
}
