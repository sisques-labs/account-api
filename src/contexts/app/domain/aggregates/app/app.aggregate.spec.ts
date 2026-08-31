import { AppBuilder } from '@contexts/app/domain/builders/app.builder';
import { AppCreatedEvent } from '@contexts/app/domain/events/app-created/app-created.event';

import { AppAggregate } from './app.aggregate';

const APP_ID = '550e8400-e29b-41d4-a716-446655440010';

const NOW = new Date('2024-01-01T00:00:00.000Z');

const buildApp = (): AppAggregate =>
  new AppBuilder()
    .withId(APP_ID)
    .withSlug('gardenia')
    .withName('Gardenia')
    .withCreatedAt(NOW)
    .withUpdatedAt(NOW)
    .build();

describe('AppAggregate', () => {
  it('should construct with matching field values', () => {
    const app = buildApp();

    expect(app.id.value).toBe(APP_ID);
    expect(app.slug.value).toBe('gardenia');
    expect(app.name.value).toBe('Gardenia');
  });

  it('should emit an AppCreatedEvent on create()', () => {
    const app = buildApp();
    app.create();
    const events = app.getUncommittedEvents();

    expect(events).toHaveLength(1);
    expect(events[0]).toBeInstanceOf(AppCreatedEvent);
    expect((events[0] as AppCreatedEvent).data).toMatchObject({
      id: APP_ID,
      slug: 'gardenia',
      name: 'Gardenia',
    });
  });

  it('should serialize to primitives', () => {
    expect(buildApp().toPrimitives()).toMatchObject({
      id: APP_ID,
      slug: 'gardenia',
      name: 'Gardenia',
    });
  });
});
