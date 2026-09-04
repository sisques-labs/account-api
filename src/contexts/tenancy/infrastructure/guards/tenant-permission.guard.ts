import { TenantPermissionEnum } from '@contexts/tenancy/domain/enums/tenant-permission.enum';
import { TENANT_ROLE_PERMISSIONS } from '@contexts/tenancy/domain/enums/tenant-role-permissions.map';
import { TenantRoleEnum } from '@contexts/tenancy/domain/enums/tenant-role.enum';
import { REQUIRES_PERMISSION_KEY } from '@contexts/tenancy/infrastructure/decorators/requires-permission.decorator';
import { IAccessTokenClaims } from '@core/security/access-token-claims.interface';
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { Request } from 'express';

/**
 * Resolves the caller's tenant role for the `tenantId` in the request
 * (REST param or GraphQL arg) and checks it against the required
 * `TenantPermissionEnum` set by `@RequiresPermission()`. Reads the role
 * straight from `request.user.tenants` (populated by `JwtAuthGuard`), the
 * same way `PlatformAdminGuard` reads `request.user.platformAdmin` — no
 * `TenantMembership` DB lookup (see `design.md`, "Permission source").
 * Must run after `JwtAuthGuard`.
 */
@Injectable()
export class TenantPermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermission = this.reflector.getAllAndOverride<
      TenantPermissionEnum | undefined
    >(REQUIRES_PERMISSION_KEY, [context.getHandler(), context.getClass()]);

    if (!requiredPermission) {
      return true;
    }

    const { request, tenantId } = this.getRequestAndTenantId(context);
    const membership = request.user?.tenants?.find(
      (tenant) => tenant.tenantId === tenantId,
    );

    if (!membership) {
      throw new ForbiddenException(
        `Caller has no membership for tenant ${tenantId}`,
      );
    }

    const grantedPermissions =
      TENANT_ROLE_PERMISSIONS[membership.role as TenantRoleEnum] ?? [];

    if (!grantedPermissions.includes(requiredPermission)) {
      throw new ForbiddenException(
        `Role ${membership.role} does not grant permission ${requiredPermission}`,
      );
    }

    return true;
  }

  private getRequestAndTenantId(context: ExecutionContext): {
    request: Request & { user: IAccessTokenClaims };
    tenantId: string;
  } {
    if (context.getType<string>() === 'graphql') {
      const gqlContext = GqlExecutionContext.create(context);
      const request = gqlContext.getContext<{
        req: Request & { user: IAccessTokenClaims };
      }>().req;
      const args = gqlContext.getArgs<Record<string, unknown>>();

      return { request, tenantId: this.extractTenantIdFromArgs(args) };
    }

    const request = context
      .switchToHttp()
      .getRequest<Request & { user: IAccessTokenClaims }>();

    return { request, tenantId: request.params.tenantId as string };
  }

  /**
   * Every tenant-scoped GraphQL operation carries `tenantId` either as a
   * top-level arg or nested under `input` (the shape every existing
   * mutation/query in this context already uses).
   */
  private extractTenantIdFromArgs(args: Record<string, unknown>): string {
    if (typeof args.tenantId === 'string') {
      return args.tenantId;
    }

    const input = args.input as Record<string, unknown> | undefined;
    if (input && typeof input.tenantId === 'string') {
      return input.tenantId;
    }

    return '';
  }
}
