import { FilterFieldRegistry } from '@sisques-labs/nestjs-kit';

import { AppQueryableField } from '@contexts/app/transport/graphql/enums/app/app-queryable-field.enum';

/**
 * Expected `Filter.value` shape per {@link AppQueryableField}, consumed by
 * `FilterValidationPipe`.
 */
export const appFilterableFields: FilterFieldRegistry<AppQueryableField> = {
  [AppQueryableField.ID]: { type: 'uuid' },
  [AppQueryableField.SLUG]: { type: 'string' },
  [AppQueryableField.NAME]: { type: 'string' },
  [AppQueryableField.CREATED_AT]: { type: 'date' },
  [AppQueryableField.UPDATED_AT]: { type: 'date' },
};
