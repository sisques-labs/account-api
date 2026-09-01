import { registerEnumType } from '@nestjs/graphql';

import { AppQueryableField } from '@contexts/app/transport/graphql/enums/app/app-queryable-field.enum';

const registeredAppEnums = [
  {
    enum: AppQueryableField,
    name: 'AppQueryableFieldEnum',
    description: 'The app fields that can be filtered/sorted on',
  },
];

for (const { enum: enumType, name, description } of registeredAppEnums) {
  registerEnumType(enumType, { name, description });
}
