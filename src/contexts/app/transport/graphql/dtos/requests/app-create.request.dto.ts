import { Field, InputType } from '@nestjs/graphql';
import { IsOptional, IsString, Matches, MinLength } from 'class-validator';

@InputType('AppCreateRequestDto')
export class AppCreateRequestDto {
  @Field(() => String, { description: 'The name of the app' })
  @IsString()
  @MinLength(1)
  name!: string;

  @Field(() => String, {
    nullable: true,
    description: 'If omitted, the slug is generated from the name',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9]+(-[a-z0-9]+)*$/, {
    message: 'slug must be lowercase, alphanumeric, hyphen-separated',
  })
  slug?: string;
}
