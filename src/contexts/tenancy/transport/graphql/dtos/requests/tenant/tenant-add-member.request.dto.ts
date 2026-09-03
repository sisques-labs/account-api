import { TenantRoleEnum } from '@contexts/tenancy/domain/enums/tenant-role.enum';
import { Field, InputType } from '@nestjs/graphql';
import { IsEmail, IsEnum, IsNotEmpty, IsUUID } from 'class-validator';

@InputType('TenantAddMemberRequestDto')
export class TenantAddMemberRequestDto {
  @Field(() => String, {
    description: 'The id of the tenant to add the member to',
  })
  @IsUUID()
  @IsNotEmpty()
  tenantId!: string;

  @Field(() => String, { description: 'Email of the existing user to add' })
  @IsEmail()
  email!: string;

  @Field(() => TenantRoleEnum, { description: 'Role to grant the new member' })
  @IsEnum(TenantRoleEnum)
  role!: TenantRoleEnum;
}
