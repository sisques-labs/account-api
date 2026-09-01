import { TenantSlugAlreadyExistsException } from '@contexts/tenancy/domain/exceptions/tenant/tenant-slug-already-exists.exception';
import {
  ITenantWriteRepository,
  TENANT_WRITE_REPOSITORY,
} from '@contexts/tenancy/domain/repositories/write/tenant-write.repository';
import { TenantSlugValueObject } from '@contexts/tenancy/domain/value-objects/tenant-slug/tenant-slug.vo';
import { Inject, Injectable } from '@nestjs/common';
import { UuidValueObject } from '@sisques-labs/nestjs-kit';

/**
 * Not `IBaseService` — that interface is single-input, and this assertion
 * inherently needs two (appId + slug).
 */
@Injectable()
export class AssertTenantSlugAvailableService {
  constructor(
    @Inject(TENANT_WRITE_REPOSITORY)
    private readonly tenantWriteRepository: ITenantWriteRepository,
  ) {}

  async execute(
    appId: UuidValueObject,
    slug: TenantSlugValueObject,
  ): Promise<void> {
    const existing = await this.tenantWriteRepository.findByAppIdAndSlug(
      appId.value,
      slug.value,
    );
    if (existing) {
      throw new TenantSlugAlreadyExistsException(slug.value, appId.value);
    }
  }
}
