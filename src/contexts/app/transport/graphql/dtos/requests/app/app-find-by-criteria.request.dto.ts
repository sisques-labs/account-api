import { Field, InputType } from '@nestjs/graphql';
import { BaseFindByCriteriaInput } from '@sisques-labs/nestjs-kit/graphql';
import { Type } from 'class-transformer';
import { IsArray, IsOptional, ValidateNested } from 'class-validator';

import { AppFilterInput } from '@contexts/app/transport/graphql/dtos/requests/app/app-filter.input';
import { AppSortInput } from '@contexts/app/transport/graphql/dtos/requests/app/app-sort.input';

@InputType('AppFindByCriteriaRequestDto')
export class AppFindByCriteriaRequestDto extends BaseFindByCriteriaInput {
  @Field(() => [AppFilterInput], {
    nullable: true,
    description: 'The filters to find by',
    defaultValue: [],
  })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => AppFilterInput)
  declare filters?: AppFilterInput[];

  @Field(() => [AppSortInput], {
    nullable: true,
    description: 'The sorts to find by',
    defaultValue: [],
  })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => AppSortInput)
  declare sorts?: AppSortInput[];
}
