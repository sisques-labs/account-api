import { InputType } from '@nestjs/graphql';
import { createFilterInput } from '@sisques-labs/nestjs-kit/graphql';

import { TenantQueryableField } from '@contexts/tenancy/transport/graphql/enums/tenant/tenant-queryable-field.enum';

/**
 * `field` is typed to {@link TenantQueryableField} instead of a free string.
 * `createFilterInput` registers its returned class `{ isAbstract: true }`, so
 * this subclass needs its own `@InputType` to actually register a concrete
 * GraphQL type.
 */
@InputType('TenantFilterInput')
export class TenantFilterInput extends createFilterInput(
  TenantQueryableField,
  'Tenant',
) {}
