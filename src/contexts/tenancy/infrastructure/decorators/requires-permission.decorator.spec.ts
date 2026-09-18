import { TenantPermissionEnum } from '@contexts/tenancy/domain/enums/tenant-permission.enum';
import { Reflector } from '@nestjs/core';

import {
  REQUIRES_PERMISSION_KEY,
  RequiresPermission,
} from './requires-permission.decorator';

describe('RequiresPermission', () => {
  it('sets the required permission as reflected metadata on the handler', () => {
    class TestController {
      @RequiresPermission(TenantPermissionEnum.MANAGE_TENANT)
      handler(): void {
        return undefined;
      }
    }

    const reflector = new Reflector();
    const permission = reflector.get<TenantPermissionEnum>(
      REQUIRES_PERMISSION_KEY,
      TestController.prototype.handler,
    );

    expect(permission).toBe(TenantPermissionEnum.MANAGE_TENANT);
  });
});
