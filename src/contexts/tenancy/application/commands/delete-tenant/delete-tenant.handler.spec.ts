import { DeleteTenantCommand } from '@contexts/tenancy/application/commands/delete-tenant/delete-tenant.command';
import { AssertTenantExistsService } from '@contexts/tenancy/application/services/write/assert-tenant-exists/assert-tenant-exists.service';
import { AssertTenantOwnerService } from '@contexts/tenancy/application/services/write/assert-tenant-owner/assert-tenant-owner.service';
import { TenantBuilder } from '@contexts/tenancy/domain/builders/tenant/tenant.builder';
import { NotTenantOwnerException } from '@contexts/tenancy/domain/exceptions/tenant/not-tenant-owner.exception';
import { TenantNotFoundException } from '@contexts/tenancy/domain/exceptions/tenant/tenant-not-found.exception';
import { ITenantMembershipWriteRepository } from '@contexts/tenancy/domain/repositories/write/tenant-membership-write.repository';
import { ITenantWriteRepository } from '@contexts/tenancy/domain/repositories/write/tenant-write.repository';
import { EventBus } from '@nestjs/cqrs';

import { DeleteTenantCommandHandler } from './delete-tenant.handler';

describe('DeleteTenantCommandHandler', () => {
  let handler: DeleteTenantCommandHandler;
  let tenantWriteRepository: jest.Mocked<ITenantWriteRepository>;
  let tenantMembershipWriteRepository: jest.Mocked<ITenantMembershipWriteRepository>;
  let assertTenantExistsService: jest.Mocked<AssertTenantExistsService>;
  let assertTenantOwnerService: jest.Mocked<AssertTenantOwnerService>;
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

  const command = new DeleteTenantCommand({
    tenantId: TENANT_ID,
    requesterUserId: OWNER_ID,
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
    assertTenantExistsService = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<AssertTenantExistsService>;
    assertTenantOwnerService = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<AssertTenantOwnerService>;
    eventBus = {
      publish: jest.fn(),
      publishAll: jest.fn(),
    } as unknown as jest.Mocked<EventBus>;

    handler = new DeleteTenantCommandHandler(
      tenantWriteRepository,
      tenantMembershipWriteRepository,
      assertTenantExistsService,
      assertTenantOwnerService,
      eventBus,
    );
  });

  it('should throw TenantNotFoundException when the tenant does not exist', async () => {
    assertTenantExistsService.execute.mockRejectedValue(
      new TenantNotFoundException(TENANT_ID),
    );

    await expect(handler.execute(command)).rejects.toThrow(
      TenantNotFoundException,
    );
    expect(assertTenantOwnerService.execute).not.toHaveBeenCalled();
    expect(tenantWriteRepository.delete).not.toHaveBeenCalled();
  });

  it('should throw NotTenantOwnerException when the requester is not an owner', async () => {
    assertTenantExistsService.execute.mockResolvedValue(buildTenant());
    assertTenantOwnerService.execute.mockRejectedValue(
      new NotTenantOwnerException(TENANT_ID, OWNER_ID),
    );

    await expect(handler.execute(command)).rejects.toThrow(
      NotTenantOwnerException,
    );
    expect(tenantWriteRepository.delete).not.toHaveBeenCalled();
    expect(
      tenantMembershipWriteRepository.deleteAllByTenantId,
    ).not.toHaveBeenCalled();
  });

  it('should delete the tenant, its memberships, and publish events', async () => {
    assertTenantExistsService.execute.mockResolvedValue(buildTenant());

    await handler.execute(command);

    expect(
      tenantMembershipWriteRepository.deleteAllByTenantId,
    ).toHaveBeenCalledWith(TENANT_ID);
    expect(tenantWriteRepository.delete).toHaveBeenCalledWith(TENANT_ID);
    expect(eventBus.publishAll).toHaveBeenCalledTimes(1);
  });
});
