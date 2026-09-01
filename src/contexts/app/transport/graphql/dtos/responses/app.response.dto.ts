import { BasePaginatedResultDto } from '@sisques-labs/nestjs-kit/graphql';
import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType('AppResponseDto')
export class AppResponseDto {
  @Field(() => ID, { description: 'The id of the app' })
  id!: string;

  @Field(() => String, { description: 'The slug of the app' })
  slug!: string;

  @Field(() => String, { description: 'The name of the app' })
  name!: string;

  @Field(() => Date, { description: 'When the app was created' })
  createdAt!: Date;

  @Field(() => Date, { description: 'When the app was last updated' })
  updatedAt!: Date;
}

@ObjectType('PaginatedAppResultDto')
export class PaginatedAppResultDto extends BasePaginatedResultDto {
  @Field(() => [AppResponseDto], {
    description: 'The apps in the current page',
  })
  items!: AppResponseDto[];
}
