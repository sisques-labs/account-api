import { UpdateTenantCommand } from '@contexts/tenancy/application/commands/update-tenant/update-tenant.command';
import { AssertTenantExistsService } from '@contexts/tenancy/application/services/write/assert-tenant-exists/assert-tenant-exists.service';
import { AssertTenantOwnerService } from '@contexts/tenancy/application/services/write/assert-tenant-owner/assert-tenant-owner.service';
import { AssertTenantSlugAvailableService } from '@contexts/tenancy/application/services/write/assert-tenant-slug-available/assert-tenant-slug-available.service';
import { TenantBuilder } from '@contexts/tenancy/domain/builders/tenant/tenant.builder';
import { NotTenantOwnerException } from '@contexts/tenancy/domain/exceptions/tenant/not-tenant-owner.exception';
import { TenantSlugAlreadyExistsException } from '@contexts/tenancy/domain/exceptions/tenant/tenant-slug-already-exists.exception';
import { ITenantWriteRepository } from '@contexts/tenancy/domain/repositories/write/tenant-write.repository';
import { EventBus } from '@nestjs/cqrs';

import { UpdateTenantCommandHandler } from './update-tenant.handler';

describe('UpdateTenantCommandHandler', () => {
  let handler: UpdateTenantCommandHandler;
  let tenantWriteRepository: jest.Mocked<ITenantWriteRepository>;
  let assertTenantExistsService: jest.Mocked<AssertTenantExistsService>;
  let assertTenantOwnerService: jest.Mocked<AssertTenantOwnerService>;
  let assertTenantSlugAvailableService: jest.Mocked<AssertTenantSlugAvailableService>;
  let eventBus: jest.Mocked<EventBus>;

  const APP_ID = '550e8400-e29b-41d4-a716-446655440010';
  const TENANT_ID = '550e8400-e29b-41d4-a716-446655440020';
  const OWNER_ID = '550e8400-e29b-41d4-a716-446655440000';

  const buildTenant = () =>
    new TenantBuilder()
      .withId(TENANT_ID)
      .withAppId(APP_ID)
      .withName('My Garden')
      .withSlug('my-garden')
      .withCreatedAt(new Date())
      .withUpdatedAt(new Date())
      .build();

  const command = new UpdateTenantCommand({
    tenantId: TENANT_ID,
    requesterUserId: OWNER_ID,
    name: 'My Renamed Garden',
  });

  beforeEach(() => {
    tenantWriteRepository = {
      findByAppIdAndSlug: jest.fn(),
      findById: jest.fn(),
      findByCriteria: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };
    assertTenantExistsService = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<AssertTenantExistsService>;
    assertTenantOwnerService = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<AssertTenantOwnerService>;
    assertTenantSlugAvailableService = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<AssertTenantSlugAvailableService>;
    eventBus = {
      publish: jest.fn(),
      publishAll: jest.fn(),
    } as unknown as jest.Mocked<EventBus>;

    handler = new UpdateTenantCommandHandler(
      tenantWriteRepository,
      assertTenantExistsService,
      assertTenantOwnerService,
      assertTenantSlugAvailableService,
      eventBus,
    );
  });

  it('should throw NotTenantOwnerException when the requester is not an owner', async () => {
    assertTenantExistsService.execute.mockResolvedValue(buildTenant());
    assertTenantOwnerService.execute.mockRejectedValue(
      new NotTenantOwnerException(TENANT_ID, OWNER_ID),
    );

    await expect(handler.execute(command)).rejects.toThrow(
      NotTenantOwnerException,
    );
    expect(tenantWriteRepository.save).not.toHaveBeenCalled();
  });

  it('should not check slug availability when the slug is unchanged', async () => {
    assertTenantExistsService.execute.mockResolvedValue(buildTenant());
    tenantWriteRepository.save.mockResolvedValue({} as never);

    await handler.execute(
      new UpdateTenantCommand({
        tenantId: TENANT_ID,
        requesterUserId: OWNER_ID,
        slug: 'my-garden',
      }),
    );

    expect(assertTenantSlugAvailableService.execute).not.toHaveBeenCalled();
  });

  it('should check slug availability when the slug changes, and reject a taken one', async () => {
    assertTenantExistsService.execute.mockResolvedValue(buildTenant());
    assertTenantSlugAvailableService.execute.mockRejectedValue(
      new TenantSlugAlreadyExistsException('new-slug', APP_ID),
    );

    await expect(
      handler.execute(
        new UpdateTenantCommand({
          tenantId: TENANT_ID,
          requesterUserId: OWNER_ID,
          slug: 'new-slug',
        }),
      ),
    ).rejects.toThrow(TenantSlugAlreadyExistsException);
    expect(tenantWriteRepository.save).not.toHaveBeenCalled();
  });

  it('should update and save the tenant, publishing its events', async () => {
    assertTenantExistsService.execute.mockResolvedValue(buildTenant());
    tenantWriteRepository.save.mockResolvedValue({} as never);

    const result = await handler.execute(command);

    expect(tenantWriteRepository.save).toHaveBeenCalledTimes(1);
    const saved = tenantWriteRepository.save.mock.calls[0][0];
    expect(saved.name.value).toBe('My Renamed Garden');
    expect(result).toEqual({
      tenantId: TENANT_ID,
      appId: APP_ID,
      name: 'My Renamed Garden',
      slug: 'my-garden',
    });
    expect(eventBus.publishAll).toHaveBeenCalledTimes(1);
  });
});
