import { UpdateTenantCommand } from '@contexts/tenancy/application/commands/update-tenant/update-tenant.command';
import { AssertTenantExistsService } from '@contexts/tenancy/application/services/write/assert-tenant-exists/assert-tenant-exists.service';
import { AssertTenantSlugAvailableService } from '@contexts/tenancy/application/services/write/assert-tenant-slug-available/assert-tenant-slug-available.service';
import { TenantAggregate } from '@contexts/tenancy/domain/aggregates/tenant/tenant.aggregate';
import {
  ITenantWriteRepository,
  TENANT_WRITE_REPOSITORY,
} from '@contexts/tenancy/domain/repositories/write/tenant-write.repository';
import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { BaseCommandHandler } from '@sisques-labs/nestjs-kit';

@CommandHandler(UpdateTenantCommand)
export class UpdateTenantCommandHandler
  extends BaseCommandHandler<UpdateTenantCommand, TenantAggregate>
  implements ICommandHandler<UpdateTenantCommand, string>
{
  private readonly logger = new Logger(UpdateTenantCommandHandler.name);

  constructor(
    @Inject(TENANT_WRITE_REPOSITORY)
    private readonly tenantWriteRepository: ITenantWriteRepository,
    private readonly assertTenantExistsService: AssertTenantExistsService,
    private readonly assertTenantSlugAvailableService: AssertTenantSlugAvailableService,
    eventBus: EventBus,
  ) {
    super(eventBus);
  }

  async execute(command: UpdateTenantCommand): Promise<string> {
    const { tenantId, name, slug } = command;

    const tenant = await this.assertTenantExistsService.execute(tenantId);

    if (slug !== undefined && slug.value !== tenant.slug.value) {
      await this.assertTenantSlugAvailableService.execute(tenant.appId, slug);
    }

    tenant.update({ name, slug });
    await this.tenantWriteRepository.save(tenant);
    await this.publishEvents(tenant);

    this.logger.log(`Tenant updated: ${tenant.id.value}`);

    return tenant.id.value;
  }
}
