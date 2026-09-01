import { Query, Resolver } from '@nestjs/graphql';

/**
 * Placeholder root Query. Apollo requires at least one Query field to build a
 * schema, and none of the registered bounded contexts expose a GraphQL Query
 * yet (they're REST-only so far) — kept until a bounded context adds its own
 * GraphQL Query.
 */
@Resolver()
export class PingResolver {
  @Query(() => String, {
    description: 'Liveness check for the GraphQL schema.',
  })
  ping(): string {
    return 'pong';
  }
}
