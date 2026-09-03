import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsUUID } from 'class-validator';

@InputType('TenantMembershipFindByTenantIdRequestDto')
export class TenantMembershipFindByTenantIdRequestDto {
  @Field(() => String, {
    description: 'The id of the tenant to list members of',
  })
  @IsUUID()
  @IsNotEmpty()
  tenantId!: string;
}
