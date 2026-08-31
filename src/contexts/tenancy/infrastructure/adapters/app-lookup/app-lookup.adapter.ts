import { AppFindByIdQuery } from '@contexts/app/application/queries/app-find-by-id/app-find-by-id.query';
import { AppNotFoundException } from '@contexts/app/domain/exceptions/app-not-found.exception';
import { AppViewModel } from '@contexts/app/domain/view-models/app.view-model';
import { IAppLookupPort } from '@contexts/tenancy/application/ports/app-lookup.port';
import { Injectable, Logger } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';

/**
 * Cross-context adapter: tenancy -> app. Dispatches via QueryBus only
 * — never imports app's domain/application directly outside this
 * `infrastructure/adapters/` file (boundary rule).
 */
@Injectable()
export class AppLookupAdapter implements IAppLookupPort {
  private readonly logger = new Logger(AppLookupAdapter.name);

  constructor(private readonly queryBus: QueryBus) {}

  async assertExists(id: string): Promise<void> {
    this.logger.log(`Looking up app by id: ${id}`);

    const app = await this.queryBus.execute<
      AppFindByIdQuery,
      AppViewModel | null
    >(new AppFindByIdQuery({ id }));

    if (!app) throw new AppNotFoundException(id);
  }
}
