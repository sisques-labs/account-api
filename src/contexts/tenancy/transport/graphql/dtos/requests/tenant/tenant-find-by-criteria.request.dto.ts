import { Field, InputType } from '@nestjs/graphql';
import { BaseFindByCriteriaInput } from '@sisques-labs/nestjs-kit/graphql';
import { Type } from 'class-transformer';
import { IsArray, IsOptional, ValidateNested } from 'class-validator';

import { TenantFilterInput } from '@contexts/tenancy/transport/graphql/dtos/requests/tenant/tenant-filter.input';
import { TenantSortInput } from '@contexts/tenancy/transport/graphql/dtos/requests/tenant/tenant-sort.input';

@InputType('TenantFindByCriteriaRequestDto')
export class TenantFindByCriteriaRequestDto extends BaseFindByCriteriaInput {
  @Field(() => [TenantFilterInput], {
    nullable: true,
    description: 'The filters to find by',
    defaultValue: [],
  })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => TenantFilterInput)
  declare filters?: TenantFilterInput[];

  @Field(() => [TenantSortInput], {
    nullable: true,
    description: 'The sorts to find by',
    defaultValue: [],
  })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => TenantSortInput)
  declare sorts?: TenantSortInput[];
}
