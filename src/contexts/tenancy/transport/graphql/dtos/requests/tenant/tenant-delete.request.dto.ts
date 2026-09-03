import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsUUID } from 'class-validator';

@InputType('TenantDeleteRequestDto')
export class TenantDeleteRequestDto {
  @Field(() => String, { description: 'The id of the tenant to delete' })
  @IsUUID()
  @IsNotEmpty()
  tenantId!: string;
}
