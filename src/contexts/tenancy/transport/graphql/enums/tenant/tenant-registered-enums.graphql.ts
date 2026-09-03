import { registerEnumType } from '@nestjs/graphql';

import { TenantRoleEnum } from '@contexts/tenancy/domain/enums/tenant-role.enum';
import { TenantQueryableField } from '@contexts/tenancy/transport/graphql/enums/tenant/tenant-queryable-field.enum';

const registeredTenantEnums = [
  {
    enum: TenantQueryableField,
    name: 'TenantQueryableFieldEnum',
    description: 'The tenant fields that can be filtered/sorted on',
  },
  {
    enum: TenantRoleEnum,
    name: 'TenantRoleEnum',
    description: 'A member role within a tenant',
  },
];

for (const { enum: enumType, name, description } of registeredTenantEnums) {
  registerEnumType(enumType, { name, description });
}
