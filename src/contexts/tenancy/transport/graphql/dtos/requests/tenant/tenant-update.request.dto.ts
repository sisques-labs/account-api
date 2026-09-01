import { Field, InputType } from '@nestjs/graphql';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';

@InputType('TenantUpdateRequestDto')
export class TenantUpdateRequestDto {
  @Field(() => String, { description: 'The id of the tenant to update' })
  @IsUUID()
  @IsNotEmpty()
  tenantId!: string;

  @Field(() => String, {
    nullable: true,
    description: 'The name of the tenant',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @Field(() => String, {
    nullable: true,
    description: 'The slug of the tenant',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  slug?: string;
}
