import { Field, InputType } from '@nestjs/graphql';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';

@InputType('TenantCreateRequestDto')
export class TenantCreateRequestDto {
  @Field(() => String, {
    description: 'UUID of the app this tenant belongs to',
  })
  @IsUUID()
  @IsNotEmpty()
  appId!: string;

  @Field(() => String, { description: 'The name of the tenant' })
  @IsString()
  @MinLength(1)
  name!: string;

  @Field(() => String, {
    nullable: true,
    description: 'Derived from `name` when omitted',
  })
  @IsOptional()
  @IsString()
  slug?: string;
}
