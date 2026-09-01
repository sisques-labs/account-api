import { TenantRoleEnum } from '@contexts/tenancy/domain/enums/tenant-role.enum';
import { TenantMembershipViewModel } from '@contexts/tenancy/domain/view-models/tenant-membership.view-model';
import { TenantMembershipGraphQLMapper } from '@contexts/tenancy/transport/graphql/mappers/tenant-membership/tenant-membership.mapper';

describe('TenantMembershipGraphQLMapper', () => {
  let mapper: TenantMembershipGraphQLMapper;

  beforeEach(() => {
    mapper = new TenantMembershipGraphQLMapper();
  });

  describe('toResponseDtoFromViewModel', () => {
    it('maps every field from the view model, casting role to TenantRoleEnum', () => {
      const vm = new TenantMembershipViewModel({
        id: 'membership-1',
        tenantId: 'tenant-1',
        userId: 'user-1',
        role: TenantRoleEnum.OWNER,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-02T00:00:00.000Z'),
      });

      expect(mapper.toResponseDtoFromViewModel(vm)).toEqual({
        id: 'membership-1',
        tenantId: 'tenant-1',
        userId: 'user-1',
        role: TenantRoleEnum.OWNER,
        createdAt: vm.createdAt,
        updatedAt: vm.updatedAt,
      });
    });
  });
});
