import { TenantRoleEnum } from '@contexts/tenancy/domain/enums/tenant-role.enum';
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum } from 'class-validator';

export class AddTenantMemberDto {
  @ApiProperty({ example: 'member@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ enum: TenantRoleEnum, example: TenantRoleEnum.MEMBER })
  @IsEnum(TenantRoleEnum)
  role!: TenantRoleEnum;
}
