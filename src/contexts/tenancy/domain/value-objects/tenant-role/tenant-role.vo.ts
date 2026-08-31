import { StringValueObject } from '@sisques-labs/nestjs-kit';

/**
 * A tenant member's role. Free text by design — only "owner" carries fixed
 * meaning for the platform (owners can invite/remove members, rename or
 * delete the tenant); every other role is defined and interpreted by the
 * consuming app (see architecture doc, "Modelo de tenancy" — layer 2).
 */
export class TenantRoleValueObject extends StringValueObject {
  public static readonly OWNER = 'owner';

  constructor(value: string) {
    super(value, {
      minLength: 1,
      maxLength: 50,
      trim: true,
      caseSensitive: false,
    });
  }

  isOwner(): boolean {
    return this.value.toLowerCase() === TenantRoleValueObject.OWNER;
  }
}
