import { CreateTenantCommand } from '@contexts/tenancy/application/commands/create-tenant/create-tenant.command';
import { ICreateTenantResult } from '@contexts/tenancy/application/commands/create-tenant/create-tenant-result.interface';
import { AssertAppExistsService } from '@contexts/tenancy/application/services/write/assert-app-exists/assert-app-exists.service';
import { AssertTenantSlugAvailableService } from '@contexts/tenancy/application/services/write/assert-tenant-slug-available/assert-tenant-slug-available.service';
import { TenantBuilder } from '@contexts/tenancy/domain/builders/tenant/tenant.builder';
import { TenantMembershipBuilder } from '@contexts/tenancy/domain/builders/tenant-membership/tenant-membership.builder';
import {
  ITenantWriteRepository,
  TENANT_WRITE_REPOSITORY,
} from '@contexts/tenancy/domain/repositories/write/tenant-write.repository';
import {
  ITenantMembershipWriteRepository,
  TENANT_MEMBERSHIP_WRITE_REPOSITORY,
} from '@contexts/tenancy/domain/repositories/write/tenant-membership-write.repository';
import { TenantRoleValueObject } from '@contexts/tenancy/domain/value-objects/tenant-role/tenant-role.vo';
import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { UuidValueObject } from '@sisques-labs/nestjs-kit';

@CommandHandler(CreateTenantCommand)
export class CreateTenantCommandHandler implements ICommandHandler<CreateTenantCommand> {
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
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: CreateTenantCommand): Promise<ICreateTenantResult> {
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
    await this.eventBus.publishAll(tenant.getUncommittedEvents());
    await tenant.commit();

    const membershipNow = new Date();
    const membership = this.tenantMembershipBuilder
      .withId(UuidValueObject.generate().value)
      .withTenantId(tenant.id.value)
      .withUserId(creatorUserId.value)
      .withRole(TenantRoleValueObject.OWNER)
      .withCreatedAt(membershipNow)
      .withUpdatedAt(membershipNow)
      .build();

    membership.create();
    await this.tenantMembershipWriteRepository.save(membership);
    await this.eventBus.publishAll(membership.getUncommittedEvents());
    await membership.commit();

    this.logger.log(
      `Tenant created: ${tenant.id.value} (owner: ${creatorUserId.value})`,
    );

    return {
      tenantId: tenant.id.value,
      appId: tenant.appId.value,
      name: tenant.name.value,
      slug: tenant.slug.value,
    };
  }
}
