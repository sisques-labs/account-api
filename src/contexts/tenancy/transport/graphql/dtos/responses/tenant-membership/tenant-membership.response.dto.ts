import { TenantRoleEnum } from '@contexts/tenancy/domain/enums/tenant-role.enum';
import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType('TenantMembershipResponseDto')
export class TenantMembershipResponseDto {
  @Field(() => ID, { description: 'The id of the membership' })
  id!: string;

  @Field(() => ID, { description: 'UUID of the tenant' })
  tenantId!: string;

  @Field(() => ID, { description: 'UUID of the member user' })
  userId!: string;

  @Field(() => TenantRoleEnum, {
    description: 'The role of the member within the tenant',
  })
  role!: TenantRoleEnum;

  @Field(() => Date, { description: 'When the membership was created' })
  createdAt!: Date;

  @Field(() => Date, { description: 'When the membership was last updated' })
  updatedAt!: Date;
}
