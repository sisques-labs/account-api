import { TenantBuilder } from '@contexts/tenancy/domain/builders/tenant.builder';
import { TenantCreatedEvent } from '@contexts/tenancy/domain/events/tenant-created/tenant-created.event';

import { TenantAggregate } from './tenant.aggregate';

const TENANT_ID = '550e8400-e29b-41d4-a716-446655440020';
const APP_ID = '550e8400-e29b-41d4-a716-446655440010';

const NOW = new Date('2024-01-01T00:00:00.000Z');

const buildTenant = (): TenantAggregate =>
  new TenantBuilder()
    .withId(TENANT_ID)
    .withAppId(APP_ID)
    .withName('My Garden')
    .withSlug('my-garden')
    .withCreatedAt(NOW)
    .withUpdatedAt(NOW)
    .build();

describe('TenantAggregate', () => {
  it('should construct with matching field values', () => {
    const tenant = buildTenant();

    expect(tenant.id.value).toBe(TENANT_ID);
    expect(tenant.appId.value).toBe(APP_ID);
    expect(tenant.name.value).toBe('My Garden');
    expect(tenant.slug.value).toBe('my-garden');
  });

  it('should emit a TenantCreatedEvent on create()', () => {
    const tenant = buildTenant();
    tenant.create();
    const events = tenant.getUncommittedEvents();

    expect(events).toHaveLength(1);
    expect(events[0]).toBeInstanceOf(TenantCreatedEvent);
    expect((events[0] as TenantCreatedEvent).data).toEqual({
      id: TENANT_ID,
      appId: APP_ID,
      name: 'My Garden',
      slug: 'my-garden',
    });
  });

  it('should serialize to primitives', () => {
    expect(buildTenant().toPrimitives()).toMatchObject({
      id: TENANT_ID,
      appId: APP_ID,
      name: 'My Garden',
      slug: 'my-garden',
    });
  });
});
