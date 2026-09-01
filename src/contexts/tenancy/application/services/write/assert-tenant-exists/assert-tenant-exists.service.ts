import { TenantAggregate } from '@contexts/tenancy/domain/aggregates/tenant/tenant.aggregate';
import { TenantNotFoundException } from '@contexts/tenancy/domain/exceptions/tenant/tenant-not-found.exception';
import {
  ITenantWriteRepository,
  TENANT_WRITE_REPOSITORY,
} from '@contexts/tenancy/domain/repositories/write/tenant-write.repository';
import { Inject, Injectable } from '@nestjs/common';
import { IBaseService, UuidValueObject } from '@sisques-labs/nestjs-kit';

@Injectable()
export class AssertTenantExistsService implements IBaseService<
  UuidValueObject,
  TenantAggregate
> {
  constructor(
    @Inject(TENANT_WRITE_REPOSITORY)
    private readonly tenantWriteRepository: ITenantWriteRepository,
  ) {}

  async execute(id: UuidValueObject): Promise<TenantAggregate> {
    const tenant = await this.tenantWriteRepository.findById(id.value);
    if (!tenant) throw new TenantNotFoundException(id.value);
    return tenant;
  }
}
