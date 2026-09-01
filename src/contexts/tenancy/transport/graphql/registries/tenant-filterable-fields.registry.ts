import { FilterFieldRegistry } from '@sisques-labs/nestjs-kit';

import { TenantQueryableField } from '@contexts/tenancy/transport/graphql/enums/tenant/tenant-queryable-field.enum';

/**
 * Expected `Filter.value` shape per {@link TenantQueryableField}, consumed by
 * `FilterValidationPipe`.
 */
export const tenantFilterableFields: FilterFieldRegistry<TenantQueryableField> =
  {
    [TenantQueryableField.ID]: { type: 'uuid' },
    [TenantQueryableField.APP_ID]: { type: 'uuid' },
    [TenantQueryableField.NAME]: { type: 'string' },
    [TenantQueryableField.SLUG]: { type: 'string' },
    [TenantQueryableField.CREATED_AT]: { type: 'date' },
    [TenantQueryableField.UPDATED_AT]: { type: 'date' },
  };
