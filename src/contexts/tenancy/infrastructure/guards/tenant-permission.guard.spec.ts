import { TenantPermissionEnum } from '@contexts/tenancy/domain/enums/tenant-permission.enum';
import { TenantRoleEnum } from '@contexts/tenancy/domain/enums/tenant-role.enum';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { TenantPermissionGuard } from './tenant-permission.guard';

describe('TenantPermissionGuard', () => {
  let guard: TenantPermissionGuard;
  let reflector: jest.Mocked<Reflector>;

  const OWNER_TENANT_ID = '550e8400-e29b-41d4-a716-446655440020';
  const OTHER_TENANT_ID = '550e8400-e29b-41d4-a716-446655440099';

  const buildRestContext = (
    tenantId: string,
    tenants?: Array<{ tenantId: string; role: string }>,
  ): ExecutionContext => {
    const request = { params: { tenantId }, user: { tenants } };
    return {
      getType: () => 'http',
      getHandler: () => (): void => undefined,
      getClass: () => TenantPermissionGuard,
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;
  };

  const buildGraphQLContext = (
    tenantId: string,
    tenants?: Array<{ tenantId: string; role: string }>,
  ): ExecutionContext => {
    const request = { user: { tenants } };
    return {
      getType: () => 'graphql',
      getHandler: () => (): void => undefined,
      getClass: () => TenantPermissionGuard,
      getArgs: () => [{}, { input: { tenantId } }, { req: request }, {}],
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as jest.Mocked<Reflector>;
    guard = new TenantPermissionGuard(reflector);
  });

  it('allows the request through when no permission is required', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    expect(guard.canActivate(buildRestContext(OWNER_TENANT_ID))).toBe(true);
  });

  it('allows a caller whose role grants the required permission', () => {
    reflector.getAllAndOverride.mockReturnValue(
      TenantPermissionEnum.MANAGE_TENANT,
    );

    const context = buildRestContext(OWNER_TENANT_ID, [
      { tenantId: OWNER_TENANT_ID, role: TenantRoleEnum.OWNER },
    ]);

    expect(guard.canActivate(context)).toBe(true);
  });

  it('rejects a caller whose role does not grant the required permission', () => {
    reflector.getAllAndOverride.mockReturnValue(
      TenantPermissionEnum.DELETE_TENANT,
    );

    const context = buildRestContext(OWNER_TENANT_ID, [
      { tenantId: OWNER_TENANT_ID, role: TenantRoleEnum.MEMBER },
    ]);

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('rejects a caller with no membership at all for the tenant', () => {
    reflector.getAllAndOverride.mockReturnValue(
      TenantPermissionEnum.VIEW_TENANT,
    );

    const context = buildRestContext(OWNER_TENANT_ID, []);

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('rejects a caller who is a member of a different tenant only', () => {
    reflector.getAllAndOverride.mockReturnValue(
      TenantPermissionEnum.MANAGE_TENANT,
    );

    const context = buildRestContext(OTHER_TENANT_ID, [
      { tenantId: OWNER_TENANT_ID, role: TenantRoleEnum.OWNER },
    ]);

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('reads the tenantId and user from the GraphQL context', () => {
    reflector.getAllAndOverride.mockReturnValue(
      TenantPermissionEnum.VIEW_TENANT,
    );

    const context = buildGraphQLContext(OWNER_TENANT_ID, [
      { tenantId: OWNER_TENANT_ID, role: TenantRoleEnum.MEMBER },
    ]);

    expect(guard.canActivate(context)).toBe(true);
  });

  it('rejects in the GraphQL context when the role lacks the permission', () => {
    reflector.getAllAndOverride.mockReturnValue(
      TenantPermissionEnum.DELETE_TENANT,
    );

    const context = buildGraphQLContext(OWNER_TENANT_ID, [
      { tenantId: OWNER_TENANT_ID, role: TenantRoleEnum.ADMIN },
    ]);

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
