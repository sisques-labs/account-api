import { CreateAppCommand } from '@contexts/app/application/commands/create-app/create-app.command';
import { AppFindAllQuery } from '@contexts/app/application/queries/app-find-all/app-find-all.query';
import { AppViewModel } from '@contexts/app/domain/view-models/app.view-model';
import { AppRestResponseDto } from '@contexts/app/transport/rest/dtos/app-rest-response.dto';
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
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

/**
 * Minimal app registry plumbing — not called out as an MVP endpoint in the
 * architecture doc, but `tenant.app_id` is a required FK and nothing else
 * creates an `app` row, so this is the smallest surface that makes
 * `POST /tenants` testable at all.
 */
@ApiTags('apps')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('apps')
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
  @ApiOperation({ summary: 'List all registered apps' })
  @ApiResponse({ status: 200, description: 'Apps list' })
  async findAll(): Promise<AppRestResponseDto[]> {
    this.logger.log('GET /apps');
    const apps = await this.queryBus.execute<AppFindAllQuery, AppViewModel[]>(
      new AppFindAllQuery(),
    );
    return apps.map((app) => this.appRestMapper.toResponseDto(app));
  }
}
