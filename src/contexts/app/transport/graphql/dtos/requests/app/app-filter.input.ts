import { InputType } from '@nestjs/graphql';
import { createFilterInput } from '@sisques-labs/nestjs-kit/graphql';

import { AppQueryableField } from '@contexts/app/transport/graphql/enums/app/app-queryable-field.enum';

/**
 * `field` is typed to {@link AppQueryableField} instead of a free string.
 * `createFilterInput` registers its returned class `{ isAbstract: true }`, so
 * this subclass needs its own `@InputType` to actually register a concrete
 * GraphQL type.
 */
@InputType('AppFilterInput')
export class AppFilterInput extends createFilterInput(
  AppQueryableField,
  'App',
) {}
