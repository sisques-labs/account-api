import { TenantMembershipBuilder } from '@contexts/tenancy/domain/builders/tenant-membership/tenant-membership.builder';
import { TenantRoleEnum } from '@contexts/tenancy/domain/enums/tenant-role.enum';
import { TenantMembershipCreatedEvent } from '@contexts/tenancy/domain/events/tenant-membership-created/tenant-membership-created.event';

import { TenantMembershipAggregate } from './tenant-membership.aggregate';

const MEMBERSHIP_ID = '550e8400-e29b-41d4-a716-446655440030';
const TENANT_ID = '550e8400-e29b-41d4-a716-446655440020';
const USER_ID = '550e8400-e29b-41d4-a716-446655440000';

const NOW = new Date('2024-01-01T00:00:00.000Z');

const buildMembership = (): TenantMembershipAggregate =>
  new TenantMembershipBuilder()
    .withId(MEMBERSHIP_ID)
    .withTenantId(TENANT_ID)
    .withUserId(USER_ID)
    .withRole(TenantRoleEnum.OWNER)
    .withCreatedAt(NOW)
    .withUpdatedAt(NOW)
    .build();

describe('TenantMembershipAggregate', () => {
  it('should construct with matching field values', () => {
    const membership = buildMembership();

    expect(membership.id.value).toBe(MEMBERSHIP_ID);
    expect(membership.tenantId.value).toBe(TENANT_ID);
    expect(membership.userId.value).toBe(USER_ID);
    expect(membership.role.value).toBe(TenantRoleEnum.OWNER);
    expect(membership.role.isOwner()).toBe(true);
  });

  it('should emit a TenantMembershipCreatedEvent on create()', () => {
    const membership = buildMembership();
    membership.create();
    const events = membership.getUncommittedEvents();

    expect(events).toHaveLength(1);
    expect(events[0]).toBeInstanceOf(TenantMembershipCreatedEvent);
    expect((events[0] as TenantMembershipCreatedEvent).data).toMatchObject({
      id: MEMBERSHIP_ID,
      tenantId: TENANT_ID,
      userId: USER_ID,
      role: TenantRoleEnum.OWNER,
    });
  });

  it('should serialize to primitives', () => {
    expect(buildMembership().toPrimitives()).toMatchObject({
      id: MEMBERSHIP_ID,
      tenantId: TENANT_ID,
      userId: USER_ID,
      role: TenantRoleEnum.OWNER,
    });
  });
});
