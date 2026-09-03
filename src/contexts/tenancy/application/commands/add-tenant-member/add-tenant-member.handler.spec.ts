import { AddTenantMemberCommand } from '@contexts/tenancy/application/commands/add-tenant-member/add-tenant-member.command';
import { IUserLookupPort } from '@contexts/tenancy/application/ports/user-lookup.port';
import { AssertTenantExistsService } from '@contexts/tenancy/application/services/write/assert-tenant-exists/assert-tenant-exists.service';
import { AssertTenantMembershipAvailableService } from '@contexts/tenancy/application/services/write/assert-tenant-membership-available/assert-tenant-membership-available.service';
import { TenantMembershipBuilder } from '@contexts/tenancy/domain/builders/tenant-membership/tenant-membership.builder';
import { TenantRoleEnum } from '@contexts/tenancy/domain/enums/tenant-role.enum';
import { MemberUserNotFoundException } from '@contexts/tenancy/domain/exceptions/tenant-membership/member-user-not-found.exception';
import { TenantMembershipAlreadyExistsException } from '@contexts/tenancy/domain/exceptions/tenant-membership/tenant-membership-already-exists.exception';
import { ITenantMembershipWriteRepository } from '@contexts/tenancy/domain/repositories/write/tenant-membership-write.repository';
import { EventBus } from '@nestjs/cqrs';

import { AddTenantMemberCommandHandler } from './add-tenant-member.handler';

describe('AddTenantMemberCommandHandler', () => {
  let handler: AddTenantMemberCommandHandler;
  let tenantMembershipWriteRepository: jest.Mocked<ITenantMembershipWriteRepository>;
  let userLookupPort: jest.Mocked<IUserLookupPort>;
  let assertTenantExistsService: jest.Mocked<AssertTenantExistsService>;
  let assertTenantMembershipAvailableService: jest.Mocked<AssertTenantMembershipAvailableService>;
  let eventBus: jest.Mocked<EventBus>;

  const TENANT_ID = '550e8400-e29b-41d4-a716-446655440020';
  const USER_ID = '550e8400-e29b-41d4-a716-446655440000';

  const command = new AddTenantMemberCommand({
    tenantId: TENANT_ID,
    email: 'member@example.com',
    role: TenantRoleEnum.MEMBER,
  });

  beforeEach(() => {
    tenantMembershipWriteRepository = {
      findByTenantIdAndUserId: jest.fn(),
      findById: jest.fn(),
      findByCriteria: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      deleteAllByTenantId: jest.fn(),
    };
    userLookupPort = { findUserIdByEmail: jest.fn() };
    assertTenantExistsService = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<AssertTenantExistsService>;
    assertTenantMembershipAvailableService = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<AssertTenantMembershipAvailableService>;
    eventBus = {
      publish: jest.fn(),
      publishAll: jest.fn(),
    } as unknown as jest.Mocked<EventBus>;

    handler = new AddTenantMemberCommandHandler(
      tenantMembershipWriteRepository,
      userLookupPort,
      assertTenantExistsService,
      assertTenantMembershipAvailableService,
      new TenantMembershipBuilder(),
      eventBus,
    );
  });

  it('should throw MemberUserNotFoundException when the email resolves to no user', async () => {
    userLookupPort.findUserIdByEmail.mockResolvedValue(null);

    await expect(handler.execute(command)).rejects.toThrow(
      MemberUserNotFoundException,
    );
    expect(tenantMembershipWriteRepository.save).not.toHaveBeenCalled();
  });

  it('should throw when the user is already a member', async () => {
    userLookupPort.findUserIdByEmail.mockResolvedValue({ userId: USER_ID });
    assertTenantMembershipAvailableService.execute.mockRejectedValue(
      new TenantMembershipAlreadyExistsException(TENANT_ID, USER_ID),
    );

    await expect(handler.execute(command)).rejects.toThrow(
      TenantMembershipAlreadyExistsException,
    );
  });

  it('should save a new membership with the resolved userId and given role', async () => {
    userLookupPort.findUserIdByEmail.mockResolvedValue({ userId: USER_ID });
    tenantMembershipWriteRepository.save.mockResolvedValue({} as never);

    const result = await handler.execute(command);

    expect(assertTenantExistsService.execute).toHaveBeenCalledWith(
      command.tenantId,
    );
    expect(tenantMembershipWriteRepository.save).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      membershipId: expect.any(String),
      tenantId: TENANT_ID,
      userId: USER_ID,
      role: TenantRoleEnum.MEMBER,
    });
  });
});
