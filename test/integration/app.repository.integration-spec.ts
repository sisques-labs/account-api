import { AppBuilder } from '../../src/contexts/app/domain/builders/app.builder';
import { APP_WRITE_REPOSITORY } from '../../src/contexts/app/domain/repositories/write/app-write.repository';
import { IAppWriteRepository } from '../../src/contexts/app/domain/repositories/write/app-write.repository';
import { AppModule } from '../../src/contexts/app/app.module';
import { truncateAll } from '../helpers/db-reset';
import {
  createIntegrationModule,
  IntegrationContext,
} from '../helpers/integration-bootstrap';

describe('App repositories (integration)', () => {
  let ctx: IntegrationContext;
  let appWriteRepo: IAppWriteRepository;
  let appBuilder: AppBuilder;

  const APP_ID = '550e8400-e29b-41d4-a716-446655440010';

  beforeAll(async () => {
    ctx = await createIntegrationModule({
      imports: [AppModule],
    });
    appWriteRepo = ctx.module.get(APP_WRITE_REPOSITORY);
    appBuilder = ctx.module.get(AppBuilder);
  });

  afterAll(async () => {
    await ctx.close();
  });

  beforeEach(async () => {
    await truncateAll(ctx.dataSource);
  });

  const seedApp = async () => {
    const now = new Date();
    const app = appBuilder
      .withId(APP_ID)
      .withSlug('gardenia')
      .withName('Gardenia')
      .withCreatedAt(now)
      .withUpdatedAt(now)
      .build();
    await appWriteRepo.save(app);
    return app;
  };

  it('should save and find an app by id', async () => {
    await seedApp();

    const found = await appWriteRepo.findById(APP_ID);

    expect(found).not.toBeNull();
    expect(found?.slug.value).toBe('gardenia');
  });

  it('should find an app by slug', async () => {
    await seedApp();

    const found = await appWriteRepo.findBySlug('gardenia');

    expect(found).not.toBeNull();
  });

  it('should enforce slug uniqueness', async () => {
    await seedApp();

    const now = new Date();
    const duplicate = appBuilder
      .withId('550e8400-e29b-41d4-a716-446655440011')
      .withSlug('gardenia')
      .withName('Gardenia Clone')
      .withCreatedAt(now)
      .withUpdatedAt(now)
      .build();

    await expect(appWriteRepo.save(duplicate)).rejects.toThrow();
  });
});
