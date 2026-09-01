import { BasePaginatedResultDto } from '@sisques-labs/nestjs-kit/graphql';
import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType('TenantResponseDto')
export class TenantResponseDto {
  @Field(() => ID, { description: 'The id of the tenant' })
  id!: string;

  @Field(() => ID, { description: 'UUID of the app this tenant belongs to' })
  appId!: string;

  @Field(() => String, { description: 'The name of the tenant' })
  name!: string;

  @Field(() => String, { description: 'The slug of the tenant' })
  slug!: string;

  @Field(() => Date, { description: 'When the tenant was created' })
  createdAt!: Date;

  @Field(() => Date, { description: 'When the tenant was last updated' })
  updatedAt!: Date;
}

@ObjectType('PaginatedTenantResultDto')
export class PaginatedTenantResultDto extends BasePaginatedResultDto {
  @Field(() => [TenantResponseDto], {
    description: 'The tenants in the current page',
  })
  items!: TenantResponseDto[];
}
