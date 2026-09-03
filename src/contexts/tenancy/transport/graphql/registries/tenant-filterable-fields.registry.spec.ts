import { FilterOperator } from '@sisques-labs/nestjs-kit';
import { FilterValidationPipe } from '@sisques-labs/nestjs-kit/graphql';

import { TenantQueryableField } from '@contexts/tenancy/transport/graphql/enums/tenant/tenant-queryable-field.enum';
import { tenantFilterableFields } from '@contexts/tenancy/transport/graphql/registries/tenant-filterable-fields.registry';

describe('tenantFilterableFields', () => {
  const pipe = new FilterValidationPipe(tenantFilterableFields);

  it('has an entry for every TenantQueryableField value', () => {
    for (const field of Object.values(TenantQueryableField)) {
      expect(tenantFilterableFields[field]).toBeDefined();
    }
  });

  it('accepts an EQUALS filter on appId with a uuid string', () => {
    const input = {
      filters: [
        {
          field: TenantQueryableField.APP_ID,
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
          field: TenantQueryableField.SLUG,
          operator: FilterOperator.LIKE,
          value: 'my-garden',
        },
      ],
    };

    expect(() => pipe.transform(input)).not.toThrow();
  });

  it('accepts a LIKE filter on name with a string value', () => {
    const input = {
      filters: [
        {
          field: TenantQueryableField.NAME,
          operator: FilterOperator.LIKE,
          value: 'My Garden',
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

  it('rejects a non-string value on the appId filter', () => {
    const input = {
      filters: [
        {
          field: TenantQueryableField.APP_ID,
          operator: FilterOperator.EQUALS,
          value: 42,
        },
      ],
    };

    expect(() => pipe.transform(input)).toThrow();
  });
});
