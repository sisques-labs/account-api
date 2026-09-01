import { InputType } from '@nestjs/graphql';
import { createSortInput } from '@sisques-labs/nestjs-kit/graphql';

import { AppQueryableField } from '@contexts/app/transport/graphql/enums/app-queryable-field.enum';

/**
 * `field` is typed to {@link AppQueryableField} instead of a free string.
 * `createSortInput` registers its returned class `{ isAbstract: true }`, so
 * this subclass needs its own `@InputType` to actually register a concrete
 * GraphQL type.
 */
@InputType('AppSortInput')
export class AppSortInput extends createSortInput(AppQueryableField, 'App') {}
