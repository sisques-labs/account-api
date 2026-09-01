import { CreateAppCommand } from '@contexts/app/application/commands/create-app/create-app.command';
import { AppCreateRequestDto } from '@contexts/app/transport/graphql/dtos/requests/app-create.request.dto';
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
export class AppMutationsResolver {
  private readonly logger = new Logger(AppMutationsResolver.name);

  constructor(
    private readonly commandBus: CommandBus,
    private readonly mutationResponseGraphQLMapper: MutationResponseGraphQLMapper,
  ) {}

  @Mutation(() => MutationResponseDto)
  async appCreate(
    @Args('input') input: AppCreateRequestDto,
  ): Promise<MutationResponseDto> {
    this.logger.log(
      `Creating app slug=${input.slug ?? '(generated from name)'}`,
    );

    const appId = await this.commandBus.execute<CreateAppCommand, string>(
      new CreateAppCommand({ slug: input.slug, name: input.name }),
    );

    return this.mutationResponseGraphQLMapper.toResponseDto({
      success: true,
      message: 'App created successfully',
      id: appId,
    });
  }
}
