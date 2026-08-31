import { DeleteTenantCommand } from '@contexts/tenancy/application/commands/delete-tenant/delete-tenant.command';
import { AssertTenantExistsService } from '@contexts/tenancy/application/services/write/assert-tenant-exists/assert-tenant-exists.service';
import { AssertTenantOwnerService } from '@contexts/tenancy/application/services/write/assert-tenant-owner/assert-tenant-owner.service';
import { TenantAggregate } from '@contexts/tenancy/domain/aggregates/tenant/tenant.aggregate';
import {
  ITenantWriteRepository,
  TENANT_WRITE_REPOSITORY,
} from '@contexts/tenancy/domain/repositories/write/tenant-write.repository';
import {
  ITenantMembershipWriteRepository,
  TENANT_MEMBERSHIP_WRITE_REPOSITORY,
} from '@contexts/tenancy/domain/repositories/write/tenant-membership-write.repository';
import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { BaseCommandHandler } from '@sisques-labs/nestjs-kit';

@CommandHandler(DeleteTenantCommand)
export class DeleteTenantCommandHandler
  extends BaseCommandHandler<DeleteTenantCommand, TenantAggregate>
  implements ICommandHandler<DeleteTenantCommand>
{
  private readonly logger = new Logger(DeleteTenantCommandHandler.name);

  constructor(
    @Inject(TENANT_WRITE_REPOSITORY)
    private readonly tenantWriteRepository: ITenantWriteRepository,
    @Inject(TENANT_MEMBERSHIP_WRITE_REPOSITORY)
    private readonly tenantMembershipWriteRepository: ITenantMembershipWriteRepository,
    private readonly assertTenantExistsService: AssertTenantExistsService,
    private readonly assertTenantOwnerService: AssertTenantOwnerService,
    eventBus: EventBus,
  ) {
    super(eventBus);
  }

  async execute(command: DeleteTenantCommand): Promise<void> {
    const { tenantId, requesterUserId } = command;

    const tenant = await this.assertTenantExistsService.execute(tenantId);
    await this.assertTenantOwnerService.execute(tenantId, requesterUserId);

    tenant.delete();

    // No DB-level FK cascade from tenant_membership to tenant — clean up
    // memberships explicitly so a hard delete doesn't leave orphan rows.
    await this.tenantMembershipWriteRepository.deleteAllByTenantId(
      tenantId.value,
    );
    await this.tenantWriteRepository.delete(tenant.id.value);
    await this.publishEvents(tenant);

    this.logger.log(`Tenant deleted: ${tenant.id.value}`);
  }
}
