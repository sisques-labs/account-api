import { CreateAppCommand } from '@contexts/app/application/commands/create-app/create-app.command';
import { AppMutationsResolver } from '@contexts/app/transport/graphql/resolvers/app-mutations.resolver';
import { CommandBus } from '@nestjs/cqrs';
import { MutationResponseGraphQLMapper } from '@sisques-labs/nestjs-kit/graphql';

describe('AppMutationsResolver', () => {
  let resolver: AppMutationsResolver;
  let commandBus: jest.Mocked<CommandBus>;
  let mutationResponseGraphQLMapper: jest.Mocked<MutationResponseGraphQLMapper>;

  const APP_ID = '550e8400-e29b-41d4-a716-446655440010';

  beforeEach(() => {
    commandBus = { execute: jest.fn() } as unknown as jest.Mocked<CommandBus>;
    mutationResponseGraphQLMapper = {
      toResponseDto: jest.fn((props) => props),
    } as unknown as jest.Mocked<MutationResponseGraphQLMapper>;
    resolver = new AppMutationsResolver(
      commandBus,
      mutationResponseGraphQLMapper,
    );
  });

  describe('appCreate', () => {
    it('dispatches CreateAppCommand and returns a success mutation response', async () => {
      commandBus.execute.mockResolvedValue(APP_ID);

      const result = await resolver.appCreate({
        name: 'Gardenia',
        slug: 'gardenia',
      });

      expect(commandBus.execute).toHaveBeenCalledWith(
        new CreateAppCommand({ slug: 'gardenia', name: 'Gardenia' }),
      );
      expect(mutationResponseGraphQLMapper.toResponseDto).toHaveBeenCalledWith({
        success: true,
        message: 'App created successfully',
        id: APP_ID,
      });
      expect(result).toEqual({
        success: true,
        message: 'App created successfully',
        id: APP_ID,
      });
    });
  });
});
