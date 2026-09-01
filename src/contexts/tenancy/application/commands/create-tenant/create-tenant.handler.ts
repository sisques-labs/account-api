import { CreateTenantCommand } from '@contexts/tenancy/application/commands/create-tenant/create-tenant.command';
import { AssertAppExistsService } from '@contexts/tenancy/application/services/write/assert-app-exists/assert-app-exists.service';
import { AssertTenantSlugAvailableService } from '@contexts/tenancy/application/services/write/assert-tenant-slug-available/assert-tenant-slug-available.service';
import { TenantBuilder } from '@contexts/tenancy/domain/builders/tenant/tenant.builder';
import { TenantMembershipBuilder } from '@contexts/tenancy/domain/builders/tenant-membership/tenant-membership.builder';
import { TenantRoleEnum } from '@contexts/tenancy/domain/enums/tenant-role.enum';
import {
  ITenantWriteRepository,
  TENANT_WRITE_REPOSITORY,
} from '@contexts/tenancy/domain/repositories/write/tenant-write.repository';
import {
  ITenantMembershipWriteRepository,
  TENANT_MEMBERSHIP_WRITE_REPOSITORY,
} from '@contexts/tenancy/domain/repositories/write/tenant-membership-write.repository';
import { Inject, Logger } from '@nestjs/common';
import {
  AggregateRoot,
  CommandHandler,
  EventBus,
  ICommandHandler,
} from '@nestjs/cqrs';
import { BaseCommandHandler, UuidValueObject } from '@sisques-labs/nestjs-kit';

@CommandHandler(CreateTenantCommand)
export class CreateTenantCommandHandler
  extends BaseCommandHandler<CreateTenantCommand, AggregateRoot>
  implements ICommandHandler<CreateTenantCommand, string>
{
  private readonly logger = new Logger(CreateTenantCommandHandler.name);

  constructor(
    @Inject(TENANT_WRITE_REPOSITORY)
    private readonly tenantWriteRepository: ITenantWriteRepository,
    @Inject(TENANT_MEMBERSHIP_WRITE_REPOSITORY)
    private readonly tenantMembershipWriteRepository: ITenantMembershipWriteRepository,
    private readonly assertAppExistsService: AssertAppExistsService,
    private readonly assertTenantSlugAvailableService: AssertTenantSlugAvailableService,
    private readonly tenantBuilder: TenantBuilder,
    private readonly tenantMembershipBuilder: TenantMembershipBuilder,
    eventBus: EventBus,
  ) {
    super(eventBus);
  }

  async execute(command: CreateTenantCommand): Promise<string> {
    const { appId, name, slug, creatorUserId } = command;

    await this.assertAppExistsService.execute(appId);
    await this.assertTenantSlugAvailableService.execute(appId, slug);

    const now = new Date();
    const tenant = this.tenantBuilder
      .withId(UuidValueObject.generate().value)
      .withAppId(appId.value)
      .withName(name.value)
      .withSlug(slug.value)
      .withCreatedAt(now)
      .withUpdatedAt(now)
      .build();

    tenant.create();
    await this.tenantWriteRepository.save(tenant);
    await this.publishEvents(tenant);

    const membershipNow = new Date();
    const membership = this.tenantMembershipBuilder
      .withId(UuidValueObject.generate().value)
      .withTenantId(tenant.id.value)
      .withUserId(creatorUserId.value)
      .withRole(TenantRoleEnum.OWNER)
      .withCreatedAt(membershipNow)
      .withUpdatedAt(membershipNow)
      .build();

    membership.create();
    await this.tenantMembershipWriteRepository.save(membership);
    await this.publishEvents(membership);

    this.logger.log(
      `Tenant created: ${tenant.id.value} (owner: ${creatorUserId.value})`,
    );

    return tenant.id.value;
  }
}
