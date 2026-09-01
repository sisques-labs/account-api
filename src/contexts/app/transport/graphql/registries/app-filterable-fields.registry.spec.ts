import { FilterOperator } from '@sisques-labs/nestjs-kit';
import { FilterValidationPipe } from '@sisques-labs/nestjs-kit/graphql';

import { AppQueryableField } from '@contexts/app/transport/graphql/enums/app-queryable-field.enum';
import { appFilterableFields } from '@contexts/app/transport/graphql/registries/app-filterable-fields.registry';

describe('appFilterableFields', () => {
  const pipe = new FilterValidationPipe(appFilterableFields);

  it('has an entry for every AppQueryableField value', () => {
    for (const field of Object.values(AppQueryableField)) {
      expect(appFilterableFields[field]).toBeDefined();
    }
  });

  it('accepts an EQUALS filter on id with a uuid string', () => {
    const input = {
      filters: [
        {
          field: AppQueryableField.ID,
          operator: FilterOperator.EQUALS,
          value: 'a3f1b2c4-0000-4000-8000-000000000000',
        },
      ],
    };

    expect(() => pipe.transform(input)).not.toThrow();
  });

  it('accepts a LIKE filter on slug with a string value', () => {
    const input = {
      filters: [
        {
          field: AppQueryableField.SLUG,
          operator: FilterOperator.LIKE,
          value: 'garden',
        },
      ],
    };

    expect(() => pipe.transform(input)).not.toThrow();
  });

  it('accepts a LIKE filter on name with a string value', () => {
    const input = {
      filters: [
        {
          field: AppQueryableField.NAME,
          operator: FilterOperator.LIKE,
          value: 'Garden',
        },
      ],
    };

    expect(() => pipe.transform(input)).not.toThrow();
  });

  it('accepts a GREATER_THAN filter on createdAt with an ISO date string', () => {
    const input = {
      filters: [
        {
          field: AppQueryableField.CREATED_AT,
          operator: FilterOperator.GREATER_THAN,
          value: '2026-01-01T00:00:00.000Z',
        },
      ],
    };

    expect(() => pipe.transform(input)).not.toThrow();
  });

  it('rejects a filter on a field outside the whitelist', () => {
    const input = {
      filters: [
        { field: 'secretColumn', operator: FilterOperator.EQUALS, value: 'x' },
      ],
    };

    expect(() => pipe.transform(input)).toThrow(/Unknown filter field/);
  });

  it('rejects a non-string value on the slug filter', () => {
    const input = {
      filters: [
        {
          field: AppQueryableField.SLUG,
          operator: FilterOperator.EQUALS,
          value: 42,
        },
      ],
    };

    expect(() => pipe.transform(input)).toThrow();
  });
});
