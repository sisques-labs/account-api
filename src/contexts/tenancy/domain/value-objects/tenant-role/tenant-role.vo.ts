import { EnumValueObject } from '@sisques-labs/nestjs-kit';
import { TenantRoleEnum } from '@contexts/tenancy/domain/enums/tenant-role.enum';

export class TenantRoleValueObject extends EnumValueObject<
  typeof TenantRoleEnum
> {
  constructor(value: TenantRoleEnum) {
    super(value);
  }

  protected get enumObject(): typeof TenantRoleEnum {
    return TenantRoleEnum as unknown as typeof TenantRoleEnum;
  }

  isOwner(): boolean {
    return this.value === TenantRoleEnum.OWNER;
  }

  isMember(): boolean {
    return this.value === TenantRoleEnum.MEMBER;
  }

  isAdmin(): boolean {
    return this.value === TenantRoleEnum.ADMIN;
  }
}
