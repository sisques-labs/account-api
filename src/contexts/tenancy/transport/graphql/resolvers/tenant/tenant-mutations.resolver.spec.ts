import { AddTenantMemberCommand } from '@contexts/tenancy/application/commands/add-tenant-member/add-tenant-member.command';
import { CreateTenantCommand } from '@contexts/tenancy/application/commands/create-tenant/create-tenant.command';
import { DeleteTenantCommand } from '@contexts/tenancy/application/commands/delete-tenant/delete-tenant.command';
import { UpdateTenantCommand } from '@contexts/tenancy/application/commands/update-tenant/update-tenant.command';
import { TenantRoleEnum } from '@contexts/tenancy/domain/enums/tenant-role.enum';
import { TenantMutationsResolver } from '@contexts/tenancy/transport/graphql/resolvers/tenant/tenant-mutations.resolver';
import { CurrentUserPayload } from '@core/security/decorators/current-user.decorator';
import { CommandBus } from '@nestjs/cqrs';
import { MutationResponseGraphQLMapper } from '@sisques-labs/nestjs-kit/graphql';

describe('TenantMutationsResolver', () => {
  let resolver: TenantMutationsResolver;
  let commandBus: jest.Mocked<CommandBus>;
  let mutationResponseGraphQLMapper: jest.Mocked<MutationResponseGraphQLMapper>;

  const TENANT_ID = '550e8400-e29b-41d4-a716-446655440010';
  const APP_ID = '550e8400-e29b-41d4-a716-446655440020';
  const MEMBERSHIP_ID = '550e8400-e29b-41d4-a716-446655440030';

  const user: CurrentUserPayload = {
    userId: '550e8400-e29b-41d4-a716-446655440040',
    email: 'owner@example.com',
    platformAdmin: false,
    tenants: [],
  };

  beforeEach(() => {
    commandBus = { execute: jest.fn() } as unknown as jest.Mocked<CommandBus>;
    mutationResponseGraphQLMapper = {
      toResponseDto: jest.fn((props) => props),
    } as unknown as jest.Mocked<MutationResponseGraphQLMapper>;
    resolver = new TenantMutationsResolver(
      commandBus,
      mutationResponseGraphQLMapper,
    );
  });

  describe('tenantCreate', () => {
    it('dispatches CreateTenantCommand with the current user as creator', async () => {
      commandBus.execute.mockResolvedValue(TENANT_ID);

      const result = await resolver.tenantCreate(
        { appId: APP_ID, name: 'My Garden', slug: 'my-garden' },
        user,
      );

      expect(commandBus.execute).toHaveBeenCalledWith(
        new CreateTenantCommand({
          appId: APP_ID,
          name: 'My Garden',
          slug: 'my-garden',
          creatorUserId: user.userId,
        }),
      );
      expect(result).toEqual({
        success: true,
        message: 'Tenant created successfully',
        id: TENANT_ID,
      });
    });
  });

  describe('tenantUpdate', () => {
    it('dispatches UpdateTenantCommand with the current user as requester', async () => {
      commandBus.execute.mockResolvedValue(TENANT_ID);

      const result = await resolver.tenantUpdate(
        { tenantId: TENANT_ID, name: 'New Name' },
        user,
      );

      expect(commandBus.execute).toHaveBeenCalledWith(
        new UpdateTenantCommand({
          tenantId: TENANT_ID,
          requesterUserId: user.userId,
          name: 'New Name',
          slug: undefined,
        }),
      );
      expect(result).toEqual({
        success: true,
        message: 'Tenant updated successfully',
        id: TENANT_ID,
      });
    });
  });

  describe('tenantDelete', () => {
    it('dispatches DeleteTenantCommand with the current user as requester', async () => {
      commandBus.execute.mockResolvedValue(undefined);

      const result = await resolver.tenantDelete({ tenantId: TENANT_ID }, user);

      expect(commandBus.execute).toHaveBeenCalledWith(
        new DeleteTenantCommand({
          tenantId: TENANT_ID,
          requesterUserId: user.userId,
        }),
      );
      expect(result).toEqual({
        success: true,
        message: 'Tenant deleted successfully',
        id: TENANT_ID,
      });
    });
  });

  describe('tenantMemberAdd', () => {
    it('dispatches AddTenantMemberCommand and returns the new membership id', async () => {
      commandBus.execute.mockResolvedValue({
        membershipId: MEMBERSHIP_ID,
        tenantId: TENANT_ID,
        userId: user.userId,
        role: TenantRoleEnum.MEMBER,
      });

      const result = await resolver.tenantMemberAdd({
        tenantId: TENANT_ID,
        email: 'member@example.com',
        role: TenantRoleEnum.MEMBER,
      });

      expect(commandBus.execute).toHaveBeenCalledWith(
        new AddTenantMemberCommand({
          tenantId: TENANT_ID,
          email: 'member@example.com',
          role: TenantRoleEnum.MEMBER,
        }),
      );
      expect(result).toEqual({
        success: true,
        message: 'Member added successfully',
        id: MEMBERSHIP_ID,
      });
    });
  });
});
