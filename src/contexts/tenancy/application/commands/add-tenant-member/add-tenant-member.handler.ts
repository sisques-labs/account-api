import { AddTenantMemberCommand } from '@contexts/tenancy/application/commands/add-tenant-member/add-tenant-member.command';
import { IAddTenantMemberResult } from '@contexts/tenancy/application/commands/add-tenant-member/add-tenant-member-result.interface';
import {
  IUserLookupPort,
  USER_LOOKUP_PORT,
} from '@contexts/tenancy/application/ports/user-lookup.port';
import { AssertTenantExistsService } from '@contexts/tenancy/application/services/write/assert-tenant-exists/assert-tenant-exists.service';
import { AssertTenantMembershipAvailableService } from '@contexts/tenancy/application/services/write/assert-tenant-membership-available/assert-tenant-membership-available.service';
import { TenantMembershipAggregate } from '@contexts/tenancy/domain/aggregates/tenant-membership/tenant-membership.aggregate';
import { TenantMembershipBuilder } from '@contexts/tenancy/domain/builders/tenant-membership/tenant-membership.builder';
import { MemberUserNotFoundException } from '@contexts/tenancy/domain/exceptions/tenant-membership/member-user-not-found.exception';
import {
  ITenantMembershipWriteRepository,
  TENANT_MEMBERSHIP_WRITE_REPOSITORY,
} from '@contexts/tenancy/domain/repositories/write/tenant-membership-write.repository';
import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { BaseCommandHandler, UuidValueObject } from '@sisques-labs/nestjs-kit';

@CommandHandler(AddTenantMemberCommand)
export class AddTenantMemberCommandHandler
  extends BaseCommandHandler<AddTenantMemberCommand, TenantMembershipAggregate>
  implements ICommandHandler<AddTenantMemberCommand>
{
  private readonly logger = new Logger(AddTenantMemberCommandHandler.name);

  constructor(
    @Inject(TENANT_MEMBERSHIP_WRITE_REPOSITORY)
    private readonly tenantMembershipWriteRepository: ITenantMembershipWriteRepository,
    @Inject(USER_LOOKUP_PORT)
    private readonly userLookupPort: IUserLookupPort,
    private readonly assertTenantExistsService: AssertTenantExistsService,
    private readonly assertTenantMembershipAvailableService: AssertTenantMembershipAvailableService,
    private readonly tenantMembershipBuilder: TenantMembershipBuilder,
    eventBus: EventBus,
  ) {
    super(eventBus);
  }

  async execute(
    command: AddTenantMemberCommand,
  ): Promise<IAddTenantMemberResult> {
    const { tenantId, email, role } = command;

    await this.assertTenantExistsService.execute(tenantId);

    const lookup = await this.userLookupPort.findUserIdByEmail(email.value);
    if (!lookup) throw new MemberUserNotFoundException(email.value);
    const userId = new UuidValueObject(lookup.userId);

    await this.assertTenantMembershipAvailableService.execute(tenantId, userId);

    const now = new Date();
    const membership = this.tenantMembershipBuilder
      .withId(UuidValueObject.generate().value)
      .withTenantId(tenantId.value)
      .withUserId(userId.value)
      .withRole(role.value)
      .withCreatedAt(now)
      .withUpdatedAt(now)
      .build();

    membership.create();
    await this.tenantMembershipWriteRepository.save(membership);
    await this.publishEvents(membership);

    this.logger.log(
      `Member added to tenant: tenant=${tenantId.value} user=${userId.value} role=${role.value}`,
    );

    return {
      membershipId: membership.id.value,
      tenantId: membership.tenantId.value,
      userId: membership.userId.value,
      role: membership.role.value,
    };
  }
}
