import { CreateTenantCommand } from '@contexts/tenancy/application/commands/create-tenant/create-tenant.command';
import { AssertAppExistsService } from '@contexts/tenancy/application/services/write/assert-app-exists/assert-app-exists.service';
import { AssertTenantSlugAvailableService } from '@contexts/tenancy/application/services/write/assert-tenant-slug-available/assert-tenant-slug-available.service';
import { TenantBuilder } from '@contexts/tenancy/domain/builders/tenant/tenant.builder';
import { TenantMembershipBuilder } from '@contexts/tenancy/domain/builders/tenant-membership/tenant-membership.builder';
import { ITenantWriteRepository } from '@contexts/tenancy/domain/repositories/write/tenant-write.repository';
import { ITenantMembershipWriteRepository } from '@contexts/tenancy/domain/repositories/write/tenant-membership-write.repository';
import { EventBus } from '@nestjs/cqrs';

import { CreateTenantCommandHandler } from './create-tenant.handler';

describe('CreateTenantCommandHandler', () => {
  let handler: CreateTenantCommandHandler;
  let tenantWriteRepository: jest.Mocked<ITenantWriteRepository>;
  let tenantMembershipWriteRepository: jest.Mocked<ITenantMembershipWriteRepository>;
  let assertAppExistsService: jest.Mocked<AssertAppExistsService>;
  let assertTenantSlugAvailableService: jest.Mocked<AssertTenantSlugAvailableService>;
  let eventBus: jest.Mocked<EventBus>;

  const APP_ID = '550e8400-e29b-41d4-a716-446655440010';
  const USER_ID = '550e8400-e29b-41d4-a716-446655440000';

  const command = new CreateTenantCommand({
    appId: APP_ID,
    name: 'My Garden',
    creatorUserId: USER_ID,
  });

  beforeEach(() => {
    tenantWriteRepository = {
      findByAppIdAndSlug: jest.fn(),
      findById: jest.fn(),
      findByCriteria: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };
    tenantMembershipWriteRepository = {
      findByTenantIdAndUserId: jest.fn(),
      findById: jest.fn(),
      findByCriteria: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      deleteAllByTenantId: jest.fn(),
    };
    assertAppExistsService = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<AssertAppExistsService>;
    assertTenantSlugAvailableService = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<AssertTenantSlugAvailableService>;
    eventBus = {
      publish: jest.fn(),
      publishAll: jest.fn(),
    } as unknown as jest.Mocked<EventBus>;

    handler = new CreateTenantCommandHandler(
      tenantWriteRepository,
      tenantMembershipWriteRepository,
      assertAppExistsService,
      assertTenantSlugAvailableService,
      new TenantBuilder(),
      new TenantMembershipBuilder(),
      eventBus,
    );
  });

  it('should derive a slug from the name when none is given', () => {
    expect(command.slug.value).toBe('my-garden');
  });

  it('should assert the app exists before asserting slug availability', async () => {
    tenantWriteRepository.save.mockResolvedValue(undefined as never);
    tenantMembershipWriteRepository.save.mockResolvedValue(undefined as never);

    await handler.execute(command);

    expect(assertAppExistsService.execute).toHaveBeenCalledWith(command.appId);
    expect(assertTenantSlugAvailableService.execute).toHaveBeenCalledWith(
      command.appId,
      command.slug,
    );
  });

  it('should not create a tenant when the app does not exist', async () => {
    assertAppExistsService.execute.mockRejectedValue(
      new Error('app not found'),
    );

    await expect(handler.execute(command)).rejects.toThrow('app not found');
    expect(tenantWriteRepository.save).not.toHaveBeenCalled();
  });

  it('should save the tenant and an owner membership for the creator', async () => {
    tenantWriteRepository.save.mockResolvedValue({} as never);
    tenantMembershipWriteRepository.save.mockResolvedValue({} as never);

    const result = await handler.execute(command);

    expect(tenantWriteRepository.save).toHaveBeenCalledTimes(1);
    expect(tenantMembershipWriteRepository.save).toHaveBeenCalledTimes(1);
    const savedMembership =
      tenantMembershipWriteRepository.save.mock.calls[0][0];
    expect(savedMembership.userId.value).toBe(USER_ID);
    expect(savedMembership.role.value).toBe('OWNER');
    expect(savedMembership.tenantId.value).toBe(result.tenantId);
    expect(result).toEqual({
      tenantId: expect.any(String),
      appId: APP_ID,
      name: 'My Garden',
      slug: 'my-garden',
    });
  });

  it('should publish events for both the tenant and the membership', async () => {
    tenantWriteRepository.save.mockResolvedValue({} as never);
    tenantMembershipWriteRepository.save.mockResolvedValue({} as never);

    await handler.execute(command);

    expect(eventBus.publishAll).toHaveBeenCalledTimes(2);
  });
});
